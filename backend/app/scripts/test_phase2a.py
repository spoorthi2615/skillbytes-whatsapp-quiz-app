import subprocess
import time
import json
import urllib.request
import urllib.error
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

# Config
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
    # Use standard text/plain MIME type
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

def test_additions():
    print("Starting uvicorn backend for Phase 2A Additions testing...")
    proc = subprocess.Popen(
        ["venv/Scripts/python", "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd="C:/Users/SPOORTHI/Desktop/PROJECT/skillbytes/backend",
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    # Wait for uvicorn to boot
    time.sleep(3)
    
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
        
        status, res = upload_file_multipart(f"{API_BASE}/assets/upload", "security_notes.txt", study_notes, headers)
        print(f"Status: {status}")
        print(f"Response: {json.dumps(res, indent=2)}")
        
        if status != 200:
            print("Upload failed. Aborting further tests.")
            return
            
        asset_id = res["data"]["id"]
        
        # 3. Trigger AI job to generate flashcards
        print("\n3. Testing POST /api/jobs (trigger generate flashcards)...")
        job_payload = {
            "asset_id": asset_id,
            "job_type": "flashcards",
            "generation_mode": "Quick Study"
        }
        status, res = send_request(f"{API_BASE}/jobs", "POST", headers=headers, data=job_payload)
        print(f"Status: {status}")
        print(f"Response: {json.dumps(res, indent=2)}")
        
        if status != 200:
            print("Job trigger failed. Aborting.")
            return
            
        job_id = res["data"]["job_id"]
        
        # 4. Poll job status to observe step-by-step progress metrics
        print("\n4. Polling GET /api/jobs/{id} for progress tracking...")
        completed = False
        for _ in range(10):
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
            
        # 5. Get generated content list and test version history
        print("\n5. Testing GET /api/content (fetching flashcards)...")
        status, res = send_request(f"{API_BASE}/content?content_type=flashcards", "GET", headers=headers)
        print(f"Status: {status}")
        if len(res["data"]) > 0:
            content_item = res["data"][0]
            content_id = content_item["_id"]
            print(f"  Found generated flashcards ID: {content_id} | Version: {content_item.get('version')} | Generation Mode: {content_item.get('generation_mode')}")
            
            # Check source citations
            print("\n  Asserting source citation mapping in flashcards:")
            cards = content_item["data"]["cards"]
            if cards:
                print(f"    Sample Card Question: '{cards[0]['question']}'")
                print(f"    Sample Card Answer: '{cards[0]['answer']}'")
                print(f"    Source Chunk ID Citation: {cards[0].get('source_chunk_id')}")
                
                # Fetch original text chunk by ID
                chunk_id = cards[0].get("source_chunk_id")
                print(f"\n    Testing GET /api/content/chunks/{chunk_id} to verify Show Source citation...")
                c_status, c_res = send_request(f"{API_BASE}/content/chunks/{chunk_id}", "GET", headers=headers)
                print(f"    Status: {c_status}")
                if c_status == 200:
                    print(f"    Original Chunk Text: '{c_res['data']['chunk_text'][:100]}...'")
                    print(f"    Generated Assessment Metrics (Objectives): {c_res['data'].get('learning_objectives')}")
                    print(f"    Difficulty: {c_res['data'].get('difficulty_score')} | Tags: {c_res['data'].get('concept_tags')}")
            
            # 6. Test Rating / Feedback endpoint
            print("\n6. Testing POST /api/content/{id}/feedback...")
            feedback_payload = {
                "rating": 5,
                "feedback": "Perfect structured mock questions."
            }
            f_status, f_res = send_request(f"{API_BASE}/content/{content_id}/feedback", "POST", headers=headers, data=feedback_payload)
            print(f"Status: {f_status}")
            print(f"Response: {json.dumps(f_res, indent=2)}")
            
            # 7. Test Bookmark Favorites endpoint
            print("\n7. Testing POST & GET /api/favorites...")
            fav_payload = {
                "content_id": content_id,
                "content_type": "flashcards",
                "title": content_item["title"]
            }
            fav_status, fav_res = send_request(f"{API_BASE}/favorites", "POST", headers=headers, data=fav_payload)
            print(f"  POST /favorites Status: {fav_status}")
            
            get_fav_status, get_fav_res = send_request(f"{API_BASE}/favorites", "GET", headers=headers)
            print(f"  GET /favorites Status: {get_fav_status} | Count: {len(get_fav_res['data'])}")
            
            # 8. Test content regeneration and version tree
            print("\n8. Testing content regeneration (triggers version 2 generation)...")
            regen_payload = {
                "asset_id": asset_id,
                "job_type": "flashcards",
                "generation_mode": "Interview Preparation" # Change mode
            }
            r_status, r_res = send_request(f"{API_BASE}/jobs", "POST", headers=headers, data=regen_payload)
            regen_job_id = r_res["data"]["job_id"]
            
            # Poll regen
            for _ in range(10):
                p_status, p_res = send_request(f"{API_BASE}/jobs/{regen_job_id}", "GET", headers=headers)
                if p_res["data"]["status"] in ["completed", "failed"]:
                    break
                time.sleep(1)
                
            # Fetch history
            print("\n  Testing GET /api/content/{id}/history...")
            h_status, h_res = send_request(f"{API_BASE}/content/{content_id}/history", "GET", headers=headers)
            print(f"  History Status: {h_status}")
            for item in h_res["data"]:
                print(f"    - Version: {item.get('version')} | Created: {item.get('created_at')} | Mode: {item.get('generation_mode')} | ID: {item.get('_id')}")
            
            # 9. Test restore version
            if len(h_res["data"]) > 1:
                v1_id = h_res["data"][0]["_id"]
                print(f"\n  Testing POST /api/content/{v1_id}/restore...")
                res_status, res_res = send_request(f"{API_BASE}/content/{v1_id}/restore", "POST", headers=headers)
                print(f"  Restore Status: {res_status}")
                print(f"  Restored New Version Number: {res_res['data'].get('version')}")

            # 10. Clean up asset
            print("\n10. Testing DELETE /api/assets/{id}...")
            del_status, del_res = send_request(f"{API_BASE}/assets/{asset_id}", "DELETE", headers=headers)
            print(f"  DELETE Status: {del_status} | Response: {json.dumps(del_res, indent=2)}")
            
        else:
            print("No generated content item found to test detail routes.")
            
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
    test_additions()
