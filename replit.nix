{ pkgs }: {
  deps = [
    pkgs.nodejs-20_x
    pkgs.ffmpeg
    pkgs.python3
    pkgs.python311Packages.pip
    pkgs.yt-dlp
    pkgs.libuuid
  ];
}
