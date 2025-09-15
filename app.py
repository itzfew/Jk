from flask import Flask, request, render_template
import subprocess, os

app = Flask(__name__)

DOWNLOAD_DIR = "/sdcard/Download/"

@app.route("/", methods=["GET", "POST"])
def index():
    message = ""
    if request.method == "POST":
        url = request.form.get("url")
        if url:
            try:
                subprocess.run(
                    ["yt-dlp", "-o", f"{DOWNLOAD_DIR}%(title)s.%(ext)s", url],
                    check=True
                )
                message = f"✅ Download complete! Saved in {DOWNLOAD_DIR}"
            except Exception as e:
                message = f"❌ Error: {e}"
    return render_template("index.html", message=message)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
