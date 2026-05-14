import requests
import time
import concurrent.futures
import sys

# Minikube ingress URL (or NodePort if ingress not available)
# In Jenkins, this runs on the host so localhost won't work if minikube doesn't tunnel,
# API URL from Jenkins (usually port-forwarded to localhost)
API_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8082/api"

# Dummy code that just passes for Problem 1
JAVA_CODE = """
class Solution {
    public int[] twoSum(int[] nums, int target) {
        for(int i=0; i<nums.length; i++) {
            for(int j=i+1; j<nums.length; j++) {
                if(nums[i] + nums[j] == target) return new int[]{i, j};
            }
        }
        return new int[0];
    }
}
"""

def submit_code():
    start_time = time.time()
    try:
        # 1. Submit
        payload = {
            "problem_id": "44444444-4444-4444-4444-000000000001", 
            "language": "java", 
            "source_code": JAVA_CODE,
            "user_id": "22222222-2222-2222-2222-000000000001",
            "test_cases": ["[2,7,11,15]\\n9"]
        }
        res = requests.post(f"{API_URL}/submit", json=payload, timeout=5)
        res.raise_for_status()
        sub_id = res.json().get("submission_id")
        if not sub_id:
            return False, "No submission ID"

        # 2. Poll for completion
        while True:
            time.sleep(1)
            status_res = requests.get(f"{API_URL}/status/{sub_id}", timeout=5)
            status_res.raise_for_status()
            data = status_res.json()
            if data.get("status") not in ["queued", "judging"]:
                end_time = time.time()
                return True, end_time - start_time
            
            if time.time() - start_time > 30:
                return False, "Timeout waiting for judge"
    except Exception as e:
        return False, str(e)

def run_stress_test(concurrency):
    print(f"\n--- Running Stress Test with {concurrency} concurrent submissions ---")
    start_time = time.time()
    
    successes = 0
    failures = 0
    max_duration = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(submit_code) for _ in range(concurrency)]
        
        for future in concurrent.futures.as_completed(futures):
            success, result = future.result()
            if success:
                successes += 1
                if result > max_duration:
                    max_duration = result
            else:
                failures += 1
                print(f"Submission failed: {result}")

    total_time = time.time() - start_time
    print(f"Results for {concurrency} requests:")
    print(f"  Successes: {successes}")
    print(f"  Failures: {failures}")
    print(f"  Max individual processing time: {max_duration:.2f}s")
    print(f"  Total test time: {total_time:.2f}s")
    
    return successes == concurrency, max_duration

if __name__ == "__main__":
    print("Testing backend connectivity...")
    try:
        requests.options(f"{API_URL}/problems", timeout=5)
    except Exception as e:
        print(f"Could not connect to backend at {API_URL}: {e}")
        sys.exit(1)

    # Gradually increasing load
    stress_levels = [2, 5, 10]
    MAX_ALLOWABLE_TIME = 20.0 # Strict limit: 20 seconds for 10 concurrent heavy Java compilations
    
    for level in stress_levels:
        passed, max_time = run_stress_test(level)
        if not passed:
            print(f"❌ Stress test failed at concurrency {level} due to submission failures.")
            sys.exit(1)
            
        if max_time > MAX_ALLOWABLE_TIME:
            print(f"❌ Stress test failed! Processing took {max_time:.2f}s, which exceeds limit of {MAX_ALLOWABLE_TIME}s.")
            sys.exit(1)
            
        print(f"✅ Passed concurrency {level}!")
        time.sleep(2) # Cooldown
        
    print("\n🎉 All stress tests passed successfully! System is performing within limits.")
    sys.exit(0)
