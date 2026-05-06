import http.server
import socketserver
import webbrowser
import os
import sys
import threading

PORT = 8088

def main():
    app_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app')
    os.chdir(app_dir)

    handler = http.server.SimpleHTTPRequestHandler
    handler.extensions_map.update({
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.css': 'text/css',
    })

    try:
        with socketserver.TCPServer(("", PORT), handler) as httpd:
            url = f"http://localhost:{PORT}"
            print("=" * 50)
            print("              词斩 - 高效背单词")
            print("=" * 50)
            print(f"  应用已启动: {url}")
            print(f"  在浏览器中打开上述地址即可使用")
            print(f"  按 Ctrl+C 退出程序")
            print("=" * 50)

            webbrowser.open(url)
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 10048:
            print(f"端口 {PORT} 已被占用，请关闭占用程序后重试。")
        else:
            print(f"启动失败: {e}")
        input("按回车键退出...")
    except KeyboardInterrupt:
        print("\n词斩已退出，再见！")

if __name__ == '__main__':
    main()
