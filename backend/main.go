package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/segmentio/kafka-go"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

// ─── Types ────────────────────────────────────────────────────────────────────

type SubmitRequest struct {
	SourceCode string   `json:"source_code"`
	Language   string   `json:"language"`
	TestCases  []string `json:"test_cases"`
	UserID     string   `json:"user_id"`
	ProblemID  string   `json:"problem_id"`
}

type SubmitResponse struct {
	SubmissionID string `json:"submission_id"`
	Status       string `json:"status"`
}

type StatusResponse struct {
	SubmissionID string      `json:"submission_id"`
	Status       string      `json:"status"`
	Verdict      string      `json:"verdict,omitempty"`
	Output       string      `json:"output,omitempty"`
	TestResults  interface{} `json:"test_results,omitempty"`
}

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

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Token   string `json:"token,omitempty"`
}

type ProblemSummary struct {
	ID     string `json:"id"`
	Slug   string `json:"slug"`
	Title  string `json:"title"`
	Points int    `json:"points"`
}

type ProblemDetail struct {
	ID           string `json:"id"`
	Slug         string `json:"slug"`
	Title        string `json:"title"`
	Points       int    `json:"points"`
	Statement    string `json:"statement"`
	InputFormat  string `json:"input_format"`
	OutputFormat string `json:"output_format"`
	Constraints  string `json:"constraints"`
}

// ─── Globals ──────────────────────────────────────────────────────────────────

var db *sql.DB
var kafkaWriter *kafka.Writer

// ─── Helpers ─────────────────────────────────────────────────────────────────

func enableCors(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	(*w).Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// ─── Database Init ────────────────────────────────────────────────────────────

func initDB() {
	host := getEnv("DB_HOST", "db")
	user := getEnv("DB_USER", "petuser")
	pass := getEnv("DB_PASS", "petpassword")
	dbname := getEnv("DB_NAME", "petdb")
	connStr := fmt.Sprintf("user=%s password=%s dbname=%s sslmode=disable host=%s", user, pass, dbname, host)

	var err error
	for i := 0; i < 10; i++ {
		db, err = sql.Open("postgres", connStr)
		if err == nil {
			if pingErr := db.Ping(); pingErr == nil {
				log.Println("Connected to Postgres")
				return
			}
		}
		log.Printf("Waiting for Postgres... attempt %d/10\n", i+1)
		time.Sleep(3 * time.Second)
	}
	log.Fatal("Failed to connect to database after retries:", err)
}

// ─── Kafka Init ───────────────────────────────────────────────────────────────

func initKafkaWriter() {
	broker := getEnv("KAFKA_BROKER", "kafka:9092")
	kafkaWriter = &kafka.Writer{
		Addr:         kafka.TCP(broker),
		Topic:        "code-submissions",
		Balancer:     &kafka.LeastBytes{},
		WriteTimeout: 10 * time.Second,
		ReadTimeout:  10 * time.Second,
	}
	log.Println("Kafka writer initialized, broker:", broker)
}

// ─── Kafka Results Consumer ───────────────────────────────────────────────────

func mapVerdict(v string) string {
	switch v {
	case "Accepted":
		return "accepted"
	case "Wrong Answer":
		return "wrong_answer"
	case "Time Limit Exceeded":
		return "tle"
	case "Memory Limit Exceeded":
		return "mle"
	case "Runtime Error":
		return "re"
	case "Compilation Error":
		return "ce"
	default:
		return "internal_error"
	}
}

func startResultsConsumer() {
	broker := getEnv("KAFKA_BROKER", "kafka:9092")
	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers:     []string{broker},
		Topic:       "judge-results",
		GroupID:     "backend-results",
		MinBytes:    1,
		MaxBytes:    10e6,
		StartOffset: kafka.LastOffset,
	})

	log.Println("Starting Kafka results consumer...")
	go func() {
		defer r.Close()
		for {
			m, err := r.ReadMessage(context.Background())
			if err != nil {
				log.Println("Results consumer error:", err)
				time.Sleep(2 * time.Second)
				continue
			}

			var result KafkaResultMsg
			if err := json.Unmarshal(m.Value, &result); err != nil {
				log.Println("Failed to unmarshal result:", err)
				continue
			}

			// If test results are empty but we have an output (e.g. compilation error),
			// put the output in the test results so the frontend can display it.
			if len(result.TestResults) == 0 && result.Output != "" {
				result.TestResults = []string{result.Output}
			}

			testResultsJSON, _ := json.Marshal(result.TestResults)
			
			dbStatus := mapVerdict(result.Verdict)

			_, dbErr := db.Exec(`
				UPDATE submissions
				SET status = $1,
				    verdict_meta = $2,
				    judged_at = NOW()
				WHERE id = $3
			`, dbStatus, string(testResultsJSON), result.SubmissionID)
			if dbErr != nil {
				log.Println("Failed to update submission:", dbErr)
			} else {
				log.Printf("Submission %s updated: verdict=%s\n", result.SubmissionID, result.Verdict)
			}
		}
	}()
}

// ─── Handlers ────────────────────────────────────────────────────────────────

func handleLogin(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	if r.Method == "OPTIONS" { w.WriteHeader(http.StatusOK); return }
	if r.Method != http.MethodPost { http.Error(w, "Method not allowed", http.StatusMethodNotAllowed); return }

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"success":false,"message":"Invalid JSON"}`, http.StatusBadRequest)
		return
	}

	fmt.Printf("Login Attempt -> User: '%s'\n", req.Username)

	var hash string
	err := db.QueryRow("SELECT password_hash FROM users WHERE username=$1", req.Username).Scan(&hash)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(LoginResponse{Success: false, Message: "Invalid credentials"})
		return
	}

	if err = bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)); err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(LoginResponse{Success: false, Message: "Invalid credentials"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(LoginResponse{Success: true, Message: "Login successful", Token: "token-for-" + req.Username})
}

func handleGetProblems(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	if r.Method == "OPTIONS" { w.WriteHeader(http.StatusOK); return }
	if r.Method != http.MethodGet { http.Error(w, "Method not allowed", http.StatusMethodNotAllowed); return }

	rows, err := db.Query("SELECT id, slug, title, points FROM problems ORDER BY order_idx ASC")
	if err != nil {
		http.Error(w, `{"error":"Failed to fetch problems"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var problems []ProblemSummary
	for rows.Next() {
		var p ProblemSummary
		if err := rows.Scan(&p.ID, &p.Slug, &p.Title, &p.Points); err != nil { continue }
		problems = append(problems, p)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(problems)
}

func handleGetProblem(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	if r.Method == "OPTIONS" { w.WriteHeader(http.StatusOK); return }
	if r.Method != http.MethodGet { http.Error(w, "Method not allowed", http.StatusMethodNotAllowed); return }

	id := r.URL.Query().Get("id")
	if id == "" { http.Error(w, `{"error":"Missing id parameter"}`, http.StatusBadRequest); return }

	var p ProblemDetail
	err := db.QueryRow(`
		SELECT id, slug, title, points, statement_md, input_format, output_format, constraints_md
		FROM problems WHERE id=$1
	`, id).Scan(&p.ID, &p.Slug, &p.Title, &p.Points, &p.Statement, &p.InputFormat, &p.OutputFormat, &p.Constraints)

	if err == sql.ErrNoRows { http.Error(w, `{"error":"Problem not found"}`, http.StatusNotFound); return }
	if err != nil { http.Error(w, `{"error":"Failed to fetch problem"}`, http.StatusInternalServerError); return }

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

func handleSubmit(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	if r.Method == "OPTIONS" { w.WriteHeader(http.StatusOK); return }
	if r.Method != http.MethodPost { http.Error(w, "Method not allowed", http.StatusMethodNotAllowed); return }

	var req SubmitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid JSON"}`, http.StatusBadRequest)
		return
	}

	if req.Language != "java" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"error": "Only Java is currently supported."})
		return
	}

	// Build wrapper code
	testCasesJava := ""
	for _, tc := range req.TestCases {
		escaped := strings.ReplaceAll(tc, "\n", "\\n")
		escaped = strings.ReplaceAll(escaped, "\"", "\\\"")
		testCasesJava += `"` + escaped + `",`
	}
	if testCasesJava == "" {
		testCasesJava = `"[2,7,11,15]\n9",`
	}

	wrapperCode := buildWrapperCode(req.SourceCode, testCasesJava)

	// Create submission record in DB
	submissionID := uuid.New().String()
	userID := getEnv("SYSTEM_USER_ID", "11111111-1111-1111-1111-000000000001")
	problemID := req.ProblemID
	if problemID == "" {
		problemID = "44444444-4444-4444-4444-000000000001"
	}
	contestID := "33333333-3333-3333-3333-000000000001" // fallback contest

	_, err := db.Exec(`
		INSERT INTO submissions (id, user_id, problem_id, contest_id, language, source_code, status)
		VALUES ($1, $2, $3, $4, $5, $6, 'queued')
	`, submissionID, userID, problemID, contestID, "java17", req.SourceCode)
	if err != nil {
		log.Println("DB insert error:", err)
		http.Error(w, `{"error":"Failed to queue submission"}`, http.StatusInternalServerError)
		return
	}

	// Publish to Kafka
	msg := KafkaSubmissionMsg{
		SubmissionID: submissionID,
		Language:     req.Language,
		WrapperCode:  wrapperCode,
		TestCases:    req.TestCases,
	}
	msgBytes, _ := json.Marshal(msg)

	err = kafkaWriter.WriteMessages(context.Background(),
		kafka.Message{
			Key:   []byte(submissionID),
			Value: msgBytes,
		},
	)
	if err != nil {
		log.Println("Kafka write error:", err)
		// Still return submission ID — can retry later
	}

	log.Printf("Queued submission %s to Kafka\n", submissionID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SubmitResponse{SubmissionID: submissionID, Status: "queued"})
}

func handleGetStatus(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	if r.Method == "OPTIONS" { w.WriteHeader(http.StatusOK); return }

	// Extract ID from path: /api/status/{id}
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, `{"error":"Missing submission ID"}`, http.StatusBadRequest)
		return
	}
	id := parts[len(parts)-1]

	var status string
	var verdictMeta sql.NullString
	err := db.QueryRow(`SELECT status, verdict_meta FROM submissions WHERE id=$1`, id).Scan(&status, &verdictMeta)
	if err == sql.ErrNoRows {
		http.Error(w, `{"error":"Submission not found"}`, http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, `{"error":"DB error"}`, http.StatusInternalServerError)
		return
	}

	resp := StatusResponse{SubmissionID: id, Status: status}
	if status != "queued" && status != "judging" && verdictMeta.Valid {
		var testResults []string
		if jsonErr := json.Unmarshal([]byte(verdictMeta.String), &testResults); jsonErr == nil {
			resp.TestResults = testResults
			
			// Map DB status back to human-readable Verdict for the frontend
			verdict := "Unknown"
			switch status {
			case "accepted": verdict = "Accepted"
			case "wrong_answer": verdict = "Wrong Answer"
			case "tle": verdict = "Time Limit Exceeded"
			case "mle": verdict = "Memory Limit Exceeded"
			case "re": verdict = "Runtime Error"
			case "ce": verdict = "Compilation Error"
			case "internal_error": verdict = "Internal Error"
			}
			resp.Verdict = verdict
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func buildWrapperCode(sourceCode, testCasesJava string) string {
	return `import java.util.*;

` + sourceCode + `

public class Main {
    public static int[] parseArray(String s) {
        s = s.replaceAll("\\[|\\]|\\s", "");
        if (s.isEmpty()) return new int[0];
        String[] parts = s.split(",");
        int[] arr = new int[parts.length];
        for(int i=0; i<parts.length; i++) arr[i] = Integer.parseInt(parts[i]);
        return arr;
    }

    public static int[] expectedTwoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }

    public static void main(String[] args) {
        String[] testCases = new String[]{` + testCasesJava + `};
        Solution sol = new Solution();
        for (int i = 0; i < testCases.length; i++) {
            if (i > 0) System.out.println("---TESTCASE---");
            try {
                String[] lines = testCases[i].split("\\n");
                int[] nums = parseArray(lines[0]);
                int target = Integer.parseInt(lines[1].trim());
                int[] userResult = sol.twoSum(nums.clone(), target);
                int[] expectedResult = expectedTwoSum(nums.clone(), target);
                if (userResult == null) userResult = new int[0];
                if (expectedResult == null) expectedResult = new int[0];
                Arrays.sort(userResult);
                Arrays.sort(expectedResult);
                if (Arrays.equals(userResult, expectedResult)) {
                    System.out.println("PASS\nOutput: " + Arrays.toString(userResult));
                } else {
                    System.out.println("FAIL\nExpected: " + Arrays.toString(expectedResult) + "\nGot: " + Arrays.toString(userResult));
                }
            } catch (Exception e) {
                System.out.println("Runtime Error: " + e.getMessage());
            }
        }
    }
}`
}

// ─── Main ─────────────────────────────────────────────────────────────────────

func main() {
	initDB()
	initKafkaWriter()
	defer kafkaWriter.Close()
	startResultsConsumer()

	http.HandleFunc("/api/login", handleLogin)
	http.HandleFunc("/api/problems", handleGetProblems)
	http.HandleFunc("/api/problem", handleGetProblem)
	http.HandleFunc("/api/submit", handleSubmit)
	http.HandleFunc("/api/status/", handleGetStatus)

	fmt.Println("Backend Server running on port 8082...")
	log.Fatal(http.ListenAndServe(":8082", nil))
}
