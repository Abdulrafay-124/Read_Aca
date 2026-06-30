import requests
resp = requests.post(
    "http://localhost:8000/api/chat/d37c0f66-aadf-4c8a-be91-3b1840884553/messages/",
    json={"content": "What books have I rented?"},
    headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzgyNDY3MzEwLCJpYXQiOjE3ODI0NjM3MTAsImp0aSI6IjllMDE2ZGYwNDgxODQzNjA4MGM4OTE4MDBmN2IwNDdlIiwidXNlcl9pZCI6IjczOWM2N2ZhLTI0MDUtNDg4YS05ZGZiLWQ5N2Q4ZjMyMjZkOSJ9.tzQBMwlRuk9hk42UCnzxwpxIB-v7BVvYUdBpWdPO4bQ"},
    stream=True,
)
for line in resp.iter_lines():
    if line:
        print(line.decode())