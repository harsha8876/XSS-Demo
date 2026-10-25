<svg width="500" height="60" onload="document.getElementById('status').textContent='XSS executed.'">
  <text x="10" y="40" font-size="28" fill="red">Injected content appeared here</text>
</svg>




stored XSS

<svg width="500" height="60" onload="document.getElementById('status').textContent='XSS executed.'">
  <text x="10" y="40" font-size="28" fill="red">Saved content appeared here</text>
</svg>


Dom based XSS


Vulnerable-

http://127.0.0.1:8000/dom?mode=vulnerable#%3Cp%3EInjected%20greeting%3C%2Fp%3E%3Cimg%20src%3D%22data%3Aimage%2Fpng%3Bbase64%2CAA%3D%3D%22%20alt%3D%22Demo%20image%22%20onerror%3D%22document.getElementById('status').textContent%3D'XSS%20executed.'%22%3E


Protected-
http://127.0.0.1:8000/dom?mode=protected#%3Cp%3EInjected%20greeting%3C%2Fp%3E%3Cimg%20src%3D%22data%3Aimage%2Fpng%3Bbase64%2CAA%3D%3D%22%20alt%3D%22Demo%20image%22%20onerror%3D%22document.getElementById('status').textContent%3D'XSS%20executed.'%22%3E