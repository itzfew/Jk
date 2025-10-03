# (1) Download Facebook/Instagram/YouTube Videos

This is a simple Termux-based tool using yt-dlp and Flask to download videos from Facebook, Instagram, and YouTube. It provides a web interface for easy access.

## Requirements

- Termux app installed on Android.
- Internet connection.

## Setup Instructions

Run the following commands in Termux to set up the environment:

```
pkg update
pkg install python
pip install flask yt-dlp
mkdir -p ~/download_logs ~/download_downloads
pkg install git
git clone https://github.com/itzfew/itzfew-termux.git
cd itzfew-termux
python social.py
```

## Usage

After running `python social.py`, the server will start on http://localhost:8080.

1. Open your browser and navigate to http://localhost:8080.
2. Enter the password: `admin123` to access the download interface.
3. Paste the video URL and select the platform to download.

Downloads will be saved to `~/download_downloads`, and logs to `~/download_logs`.
