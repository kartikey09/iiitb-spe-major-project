package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/segmentio/kafka-go"
)

// ─── Types ────────────────────────────────────────────────────────────────────

type KafkaSubmissionMsg struct {
	SubmissionID string   `json:"submission_id"`
	Language     string   `json:"language"`
	WrapperCode  string   `json:"wrapper_code"`
	TestCases    []string `json:"test_cases"`
}

type KafkaResultMsg struct {
	SubmissionID string   `json:"submission_id"`
	Verdict      string   `json:"verdict"`
	Output       string   `json:"output"`
	TestResults  []string `json:"test_results"`
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func runCommand(name string, args ...string) (int, string, string, error) {
	cmd := exec.Command(name, args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()
	exitCode := 0
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			exitCode = exitError.ExitCode()
		} else {
			return -1, stdout.String(), stderr.String(), err
		}
	}
	return exitCode, stdout.String(), stderr.String(), nil
}

// ─── Judge Logic ─────────────────────────────────────────────────────────────

func judgeSubmission(msg KafkaSubmissionMsg) KafkaResultMsg {
	result := KafkaResultMsg{SubmissionID: msg.SubmissionID}

	// Clean up previous box
	runCommand("isolate", "--cg", "--cleanup")

	// Init sandbox
	exitCode, stdout, stderr, err := runCommand("isolate", "--cg", "--init")
	if exitCode != 0 || err != nil {
		result.Verdict = "Internal Error"
		result.Output = "Sandbox init failed: " + stderr
		return result
	}

	boxPath := strings.TrimSpace(stdout)
	boxDir := filepath.Join(boxPath, "box")
	mainJava := filepath.Join(boxDir, "Main.java")

	if err := ioutil.WriteFile(mainJava, []byte(msg.WrapperCode), 0644); err != nil {
		result.Verdict = "Internal Error"
		result.Output = "Failed to write source"
		return result
	}

	// Compile
	compExit, compStdout, compStderr, _ := runCommand(
		"isolate", "--cg", "--box-id=0",
		"--time=10", "--wall-time=20",
		"--cg-mem=512000", "--processes=100",
		"--dir=/etc", "--stderr-to-stdout",
		"--run", "--", "/usr/bin/javac", "Main.java",
	)
	if compExit != 0 {
		result.Verdict = "Compilation Error"
		result.Output = compStdout + "\n" + compStderr
		return result
	}

	// Execute
	runCommand(
		"isolate", "--cg", "--box-id=0",
		"--time=3", "--wall-time=5",
		"--cg-mem=262144", "--processes=50",
		"--dir=/etc",
		"--stdout=out.txt", "--stderr=err.txt",
		"--meta=/tmp/meta.txt",
		"--run", "--", "/usr/bin/java", "Main",
	)

	// Read outputs
	outContent, _ := ioutil.ReadFile(filepath.Join(boxDir, "out.txt"))
	errContent, _ := ioutil.ReadFile(filepath.Join(boxDir, "err.txt"))
	metaContent, _ := ioutil.ReadFile("/tmp/meta.txt")

	telemetry := make(map[string]string)
	for _, line := range strings.Split(string(metaContent), "\n") {
		parts := strings.SplitN(line, ":", 2)
		if len(parts) == 2 {
			telemetry[strings.TrimSpace(parts[0])] = strings.TrimSpace(parts[1])
		}
	}

	status := "Accepted"
	if statCode, ok := telemetry["status"]; ok {
		switch statCode {
		case "RE":
			status = "Runtime Error"
		case "TO":
			status = "Time Limit Exceeded"
		case "SG":
			status = "Fatal Signal"
		case "XX":
			status = "Internal Error"
		}
	}

	if status != "Accepted" {
		result.Verdict = status
		result.Output = string(outContent) + "\n" + string(errContent)
		return result
	}

	// Parse per-testcase results
	verdict := "Accepted"
	testResults := []string{}
	rawResults := strings.Split(string(outContent), "---TESTCASE---\n")
	for _, res := range rawResults {
		clean := strings.TrimSpace(res)
		testResults = append(testResults, clean)
		if strings.HasPrefix(clean, "FAIL") || strings.Contains(clean, "Runtime Error") {
			verdict = "Wrong Answer"
		}
	}

	result.Verdict = verdict
	result.TestResults = testResults
	if verdict == "Accepted" {
		result.Output = "All test cases passed."
	} else {
		result.Output = "Some test cases failed."
	}
	return result
}

// ─── Main ─────────────────────────────────────────────────────────────────────

func main() {
	broker := getEnv("KAFKA_BROKER", "kafka:9092")

	// Wait for Kafka to be ready
	log.Println("Waiting for Kafka broker at", broker)
	for i := 0; i < 20; i++ {
		conn, err := kafka.Dial("tcp", broker)
		if err == nil {
			conn.Close()
			break
		}
		log.Printf("Kafka not ready, attempt %d/20: %v\n", i+1, err)
		time.Sleep(5 * time.Second)
	}
	log.Println("Kafka ready!")

	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:     []string{broker},
		Topic:       "code-submissions",
		GroupID:     "judge-workers",
		MinBytes:    1,
		MaxBytes:    10e6,
		StartOffset: kafka.FirstOffset,
	})

	writer := &kafka.Writer{
		Addr:         kafka.TCP(broker),
		Topic:        "judge-results",
		Balancer:     &kafka.LeastBytes{},
		WriteTimeout: 10 * time.Second,
	}

	defer reader.Close()
	defer writer.Close()

	fmt.Println("Judge Worker started. Waiting for submissions...")

	for {
		m, err := reader.ReadMessage(context.Background())
		if err != nil {
			log.Println("Error reading from Kafka:", err)
			time.Sleep(2 * time.Second)
			continue
		}

		var msg KafkaSubmissionMsg
		if err := json.Unmarshal(m.Value, &msg); err != nil {
			log.Println("Failed to unmarshal submission:", err)
			continue
		}

		log.Printf("Processing submission %s...\n", msg.SubmissionID)
		result := judgeSubmission(msg)
		log.Printf("Submission %s done: verdict=%s\n", msg.SubmissionID, result.Verdict)

		resultBytes, _ := json.Marshal(result)
		err = writer.WriteMessages(context.Background(),
			kafka.Message{
				Key:   []byte(result.SubmissionID),
				Value: resultBytes,
			},
		)
		if err != nil {
			log.Println("Failed to write result to Kafka:", err)
		}
	}
}
