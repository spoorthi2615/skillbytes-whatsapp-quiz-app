import subprocess
import time
import json
import urllib.request
import urllib.error
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

API_BASE = "http://127.0.0.1:8000/api"

def send_request(url, method="GET", headers=None, data=None):
    if headers is None:
        headers = {}
    if data is not None:
        data_bytes = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    else:
        data_bytes = None
        
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode("utf-8")
            return response.status, json.loads(res_data)
    except urllib.error.HTTPError as e:
        res_data = e.read().decode("utf-8")
        try:
            parsed = json.loads(res_data)
        except Exception:
            parsed = res_data
        return e.code, parsed
    except Exception as e:
        return 500, str(e)

def upload_file_multipart(url, file_name, content_str, headers=None):
    if headers is None:
        headers = {}
    
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    CRLF = "\r\n"
    
    body = []
    body.append(f"--{boundary}")
    body.append(f'Content-Disposition: form-data; name="file"; filename="{file_name}"')
    body.append("Content-Type: text/plain")
    body.append("")
    body.append(content_str)
    body.append(f"--{boundary}--")
    body.append("")
    
    payload_str = CRLF.join(body)
    payload_bytes = payload_str.encode("utf-8")
    
    headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
    
    req = urllib.request.Request(url, data=payload_bytes, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode("utf-8")
            return response.status, json.loads(res_data)
    except urllib.error.HTTPError as e:
        res_data = e.read().decode("utf-8")
        try:
            parsed = json.loads(res_data)
        except Exception:
            parsed = res_data
        return e.code, parsed
    except Exception as e:
        return 500, str(e)

def test_phase2b_endpoints():
    print("Starting uvicorn backend for Phase 2B Assessment Engine testing...")
    proc = subprocess.Popen(
        ["venv/Scripts/python", "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd="C:/Users/SPOORTHI/Desktop/PROJECT/skillbytes/backend",
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    # Wait for uvicorn to boot
    time.sleep(3.5)
    
    try:
        # 1. Login user
        print("\n1. Logging in to acquire JWT token...")
        login_payload = {
            "email": "student@test.com",
            "password": "Test@123"
        }
        status, res = send_request(f"{API_BASE}/auth/login", "POST", data=login_payload)
        if status != 200:
            print(f"Login failed: {res}")
            return
            
        token = res["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Success: JWT token acquired.")
        
        # 2. Upload test TXT file (study notes)
        print("\n2. Testing POST /api/assets/upload...")
        study_notes = (
            "Introduction to Cybersecurity & Cryptography.\n"
            "This document teaches the basics of security. We study encryption, decryption, and secure keys.\n"
            "We also analyze firewall protection and network security mechanisms to protect systems.\n"
            "OWASP Top 10 vulnerabilities like SQL injection and cross-site scripting (XSS) must be secured.\n"
            "Network monitoring detects potential malware before they spread into critical assets.\n"
            "Always follow security guidelines and update access permissions."
        )
        
        status, res = upload_file_multipart(f"{API_BASE}/assets/upload", "assessment_notes.txt", study_notes, headers)
        print(f"Status: {status}")
        print(f"Response: {json.dumps(res, indent=2)}")
        
        if status != 200:
            print("Upload failed. Aborting further tests.")
            return
            
        asset_id = res["data"]["id"]
        
        # 2.5 Chunk asset first by running standard summary generation job
        print("\n2.5 Running setup summary job to chunk document...")
        setup_payload = {
            "asset_id": asset_id,
            "job_type": "summary",
            "generation_mode": "Quick Study"
        }
        status, res = send_request(f"{API_BASE}/jobs", "POST", headers=headers, data=setup_payload)
        setup_job_id = res["data"]["job_id"]
        for _ in range(10):
            p_status, p_res = send_request(f"{API_BASE}/jobs/{setup_job_id}", "GET", headers=headers)
            if p_res["data"]["status"] in ["completed", "failed"]:
                break
            time.sleep(1)
        print("Setup chunking completed.")

        # 3. Trigger AI job to generate assessment
        print("\n3. Testing POST /api/assessments/generate (using template 'Revision Test')...")
        job_payload = {
            "asset_id": asset_id,
            "template_name": "Revision Test",
            "title": "Cybersecurity Revision Test"
        }
        status, res = send_request(f"{API_BASE}/assessments/generate", "POST", headers=headers, data=job_payload)
        print(f"Status: {status}")
        print(f"Response: {json.dumps(res, indent=2)}")
        
        if status != 200:
            print("Job trigger failed. Aborting.")
            return
            
        job_id = res["data"]["job_id"]
        
        # 4. Poll job status to observe progress metrics
        print("\n4. Polling GET /api/jobs/{id} for progress tracking...")
        completed = False
        for _ in range(12):
            p_status, p_res = send_request(f"{API_BASE}/jobs/{job_id}", "GET", headers=headers)
            if p_status == 200:
                job_data = p_res["data"]
                print(f"  Job Status: {job_data['status']} | Progress: {job_data.get('progress')}% | Current Step: {job_data.get('current_step')}")
                if job_data["status"] in ["completed", "failed"]:
                    completed = True
                    break
            time.sleep(1)
            
        if not completed:
            print("Job timed out before completion.")
            return
            
        assessment_id = p_res["data"]["result_id"]
        
        # 5. Fetch assessment player details
        print(f"\n5. Testing GET /api/assessments/{assessment_id}...")
        status, res = send_request(f"{API_BASE}/assessments/{assessment_id}", "GET", headers=headers)
        print(f"Status: {status}")
        if status == 200:
            a_data = res["data"]["assessment"]
            questions = res["data"]["questions"]
            print(f"  Assessment Title: {a_data.get('title')} | Question Count: {a_data.get('question_count')}")
            print(f"  Question Types Seeded: {a_data.get('question_types')}")
            print(f"  First Question Type: {questions[0].get('question_type')} | Quality Score: {questions[0].get('quality_score')}")
            
            # Prepare answers dictionary
            answers_dict = {}
            for idx, q in enumerate(questions):
                q_id = q["_id"]
                q_type = q["question_type"]
                
                # Setup realistic answers depending on type
                if q_type == "mcq" or q_type == "true_false":
                    answers_dict[q_id] = q.get("correct_answer") # auto-correct
                elif q_type == "fill_blank":
                    answers_dict[q_id] = q.get("correct_answer") # auto-correct
                elif q_type == "coding":
                    answers_dict[q_id] = {"solution": "def check_security(data):\n    return True", "language": "Python"}
                else:
                    answers_dict[q_id] = "Testing dynamic scenario text input."
            
            # 6. Submit answers to grade assessment
            print(f"\n6. Testing POST /api/assessments/{assessment_id}/submit...")
            submission_payload = {
                "answers": answers_dict,
                "duration_ms": 120000 # 2 minutes
            }
            sub_status, sub_res = send_request(f"{API_BASE}/assessments/{assessment_id}/submit", "POST", headers=headers, data=submission_payload)
            print(f"Status: {sub_status}")
            print(f"Submission Results: {json.dumps(sub_res['data'], indent=2)}")
            
            # 7. Submit coding solution draft
            print(f"\n7. Testing POST /api/assessments/coding/submit...")
            coding_payload = {
                "question_id": questions[0]["_id"],
                "language": "Python",
                "solution": "print('Hello Security')"
            }
            code_status, code_res = send_request(f"{API_BASE}/assessments/coding/submit", "POST", headers=headers, data=coding_payload)
            print(f"Status: {code_status}")
            print(f"Response: {json.dumps(code_res, indent=2)}")

            # 8. Test Export assessment (Addition 5)
            print(f"\n8. Testing GET /api/assessments/{assessment_id}/export...")
            exp_status, exp_res = send_request(f"{API_BASE}/assessments/{assessment_id}/export", "GET", headers=headers)
            print(f"Status: {exp_status}")
            print(f"Export Markdown Excerpt:\n{exp_res['data'].get('markdown')[:200]}...")

            # 9. Verify concept mastery list (Addition 4)
            print(f"\n9. Testing GET /api/assessments/mastery...")
            m_status, m_res = send_request(f"{API_BASE}/assessments/mastery", "GET", headers=headers)
            print(f"Status: {m_status}")
            print(f"Concept Mastery Log: {json.dumps(m_res['data'][:3], indent=2)}")

            # 10. Fetch Assessments Dashboard
            print(f"\n10. Testing GET /api/assessments (dashboard)...")
            dash_status, dash_res = send_request(f"{API_BASE}/assessments", "GET", headers=headers)
            print(f"Status: {dash_status}")
            print(f"Assessments Dash Count: {len(dash_res['data'])}")
            if len(dash_res['data']) > 0:
                print(f"  Dash First Item Attempts: {dash_res['data'][0].get('total_attempts')} | Best: {dash_res['data'][0].get('best_score')} | Latest: {dash_res['data'][0].get('latest_score')}")

            # 11. Clean up asset
            print("\n11. Testing DELETE /api/assets/{id}...")
            del_status, del_res = send_request(f"{API_BASE}/assets/{asset_id}", "DELETE", headers=headers)
            print(f"  DELETE Status: {del_status} | Response: {json.dumps(del_res, indent=2)}")
            
        else:
            print("No assessment items found to test.")
            
    finally:
        print("\nStopping uvicorn backend...")
        proc.terminate()
        try:
            proc.wait(timeout=5)
            print("Uvicorn stopped cleanly.")
        except subprocess.TimeoutExpired:
            proc.kill()
            print("Uvicorn killed.")

if __name__ == "__main__":
    test_phase2b_endpoints()
