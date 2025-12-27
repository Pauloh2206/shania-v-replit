{ pkgs }: {
  deps = [
    pkgs.nodejs-20_x
    pkgs.ffmpeg
    pkgs.python3
    pkgs.yt-dlp
  ];
}
