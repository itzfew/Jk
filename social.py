from flask import Flask, request, render_template_string, redirect, url_for, session, send_file
import subprocess, shlex, os, time
from threading import Thread

app = Flask(__name__)
app.secret_key = "supersecretkey"

LOG_DIR = os.path.expanduser("~/dawoalod_logs")
DOWNLOAD_DIR = os.path.expanduser("~/dawoalod_downloads")
os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

PASSWORD = "Waheed123"
# Keep track of last downloaded file (global)
last_downloaded_file = None

PAGE_HTML = '''
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Dawoalod Downloader</title>
<style>
body { font-family: Arial, sans-serif; padding: 20px; background: #f8f9fa; }
h2 { color: #333; }
form { margin-bottom: 20px; }
input, select, button { padding: 8px; margin: 5px 0; }
pre { background: #000; color: #0f0; padding: 10px; max-height: 300px; overflow: auto; }
#downloadBtn { margin-top: 10px; padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; }
#downloadBtn:hover { background: #0056b3; }
</style>
</head>
<body>

<h2>Dawoalod Multi-Platform Downloader</h2>

{% if not session.get("authenticated") %}
<form method="POST">
    Password: <input type="password" name="password" required>
    <button type="submit">Enter</button>
</form>
{% else %}
<form method="POST">
    Video URL: <input type="text" name="url" required style="width:400px;">
    Format:
    <select name="format">
        <option value="mp4">MP4 (Video)</option>
        <option value="mp3">MP3 (Audio)</option>
    </select>
    Quality:
    <select name="quality">
        <option value="best">Best</option>
        <option value="720">720p</option>
        <option value="480">480p</option>
        <option value="360">360p</option>
    </select>
    <button type="submit">Download</button>
</form>
{% endif %}

{% if streaming %}
<h3>Logs:</h3>
<pre id="log"></pre>
<button id="downloadBtn" onclick="window.location.href='/download_file/{{ streaming }}'">Download Video</button>
<script>
const evtSource = new EventSource("/stream/{{ streaming }}");
const log = document.getElementById("log");
evtSource.onmessage = function(e) {
    log.textContent += e.data + "\\n";
    log.scrollTop = log.scrollHeight;
};
</script>
{% elif last_file %}
<h3>Last Downloaded Video:</h3>
<a id="downloadBtn" href="/download_last">{{ last_file }}</a>
{% endif %}

</body>
</html>
'''

@app.route("/", methods=["GET", "POST"])
def index():
    global last_downloaded_file
    if not session.get("authenticated"):
        error = None
        if request.method == "POST":
            pw = request.form.get("password")
            if pw == PASSWORD:
                session["authenticated"] = True
                return redirect(url_for("index"))
            else:
                error = "Incorrect password!"
        return render_template_string(PAGE_HTML, streaming=None, last_file=None, error=error)
    
    streaming_id = None
    if request.method == "POST":
        url = request.form.get("url")
        fmt = request.form.get("format", "mp4")
        quality = request.form.get("quality", "best")
        if url:
            streaming_id = str(abs(hash(url + fmt + quality)))
            log_file = os.path.join(LOG_DIR, f"log_{streaming_id}.txt")
            if os.path.exists(log_file):
                os.remove(log_file)
            Thread(target=start_download, args=(url, fmt, quality, streaming_id)).start()

    return render_template_string(PAGE_HTML, streaming=streaming_id, last_file=last_downloaded_file)

def start_download(url, fmt, quality, stream_id):
    global last_downloaded_file
    log_file = os.path.join(LOG_DIR, f"log_{stream_id}.txt")
    with open(log_file, "w") as f:
        f.write(f"Starting download: {url}\nFormat: {fmt}, Quality: {quality}\n")

    out_template = os.path.join(DOWNLOAD_DIR, "%(title)s.%(ext)s")
    if fmt == "mp3":
        cmd = f'yt-dlp -x --audio-format mp3 -o "{out_template}" {shlex.quote(url)}'
    else:
        if quality != "best":
            cmd = f'yt-dlp -f "bestvideo[height<={quality}]+bestaudio/best[height<={quality}]" -o "{out_template}" {shlex.quote(url)}'
        else:
            cmd = f'yt-dlp -f best -o "{out_template}" {shlex.quote(url)}'

    process = subprocess.Popen(shlex.split(cmd), stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    last_file = None
    with open(log_file, "a") as f:
        for line in process.stdout:
            print(line, end="")
            f.write(line)
            f.flush()
    # After download, save last downloaded file
    files = sorted(os.listdir(DOWNLOAD_DIR), key=lambda x: os.path.getmtime(os.path.join(DOWNLOAD_DIR, x)), reverse=True)
    if files:
        last_file = files[0]
        last_downloaded_file = last_file
    with open(log_file, "a") as f:
        f.write("Download finished!\n")

@app.route("/stream/<stream_id>")
def stream_logs(stream_id):
    log_file = os.path.join(LOG_DIR, f"log_{stream_id}.txt")
    def generate():
        open(log_file, 'a').close()
        last_line = ""
        while True:
            if os.path.exists(log_file):
                with open(log_file, "r") as f:
                    lines = f.readlines()
                    new_lines = lines[lines.index(last_line)+1:] if last_line in lines else lines
                    for line in new_lines:
                        last_line = line
                        yield f"data: {line.rstrip()}\n\n"
            time.sleep(0.5)
    return app.response_class(generate(), mimetype='text/event-stream')

@app.route("/download_file/<stream_id>")
def download_file(stream_id):
    global last_downloaded_file
    if last_downloaded_file:
        filepath = os.path.join(DOWNLOAD_DIR, last_downloaded_file)
        if os.path.exists(filepath):
            return send_file(filepath, as_attachment=True)
    return "File not ready yet.", 404

@app.route("/download_last")
def download_last():
    global last_downloaded_file
    if last_downloaded_file:
        filepath = os.path.join(DOWNLOAD_DIR, last_downloaded_file)
        if os.path.exists(filepath):
            return send_file(filepath, as_attachment=True)
    return "No downloaded file yet.", 404

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, threaded=True)
