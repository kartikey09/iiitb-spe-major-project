package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
)

type ExecuteRequest struct {
	SourceCode string `json:"source_code"`
}

func testApi(url, title, code string) {
	fmt.Println(title)
	reqBody, _ := json.Marshal(ExecuteRequest{SourceCode: code})
	
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}
	defer resp.Body.Close()
	
	body, _ := ioutil.ReadAll(resp.Body)
	fmt.Println(string(body))
	fmt.Println("--------------------------------------------------")
}

func main() {
	url := "http://localhost:8080/execute"

	javaCode := `public class Main { public static void main(String[] args) { System.out.println("Hello from Custom Judge!"); } }`
	testApi(url, "Testing Hello World...", javaCode)

	javaBomb := `public class Main { public static void main(String[] args) { while (true) { new Thread(() -> { while(true) { try { Thread.sleep(100); } catch(Exception e) {} } }).start(); } } }`
	testApi(url, "Testing Fork Bomb Limit...", javaBomb)

	javaNet := `import java.net.URL; import java.net.HttpURLConnection; public class Main { public static void main(String[] args) { try { URL url = new URL("http://google.com"); HttpURLConnection con = (HttpURLConnection) url.openConnection(); con.getResponseCode(); System.out.println("Network accessed!"); } catch (Exception e) { System.err.println("Network error: " + e.getMessage()); } } }`
	testApi(url, "Testing Network Isolation...", javaNet)

	javaFile := `import java.nio.file.Files; import java.nio.file.Paths; public class Main { public static void main(String[] args) { try { String content = new String(Files.readAllBytes(Paths.get("/etc/shadow"))); System.out.println(content); } catch (Exception e) { System.err.println("File error: " + e.getMessage()); } } }`
	testApi(url, "Testing File Isolation...", javaFile)
}
