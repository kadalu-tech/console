"""
Utility to build or run dev server for the Static webapps
"""
import argparse
import os


def get_args():
    """Parse CLI arguments"""
    parser = argparse.ArgumentParser(prog='PROG')
    subparsers = parser.add_subparsers(dest="cmd", help='Actions')

    parser_build = subparsers.add_parser('build', help='Build the Webapp')
    parser_build.add_argument('-o', '--output-dir', help='Output directory', default="output")
    parser_build.add_argument('-t', '--templates-dir', help='Templates directory', default="templates")
    parser_build.add_argument('-s', '--static-dir', help='Static directory', default="static")

    parser_build = subparsers.add_parser('dev', help='Start development Server')
    parser_build.add_argument('-p', '--port', type=int, default=8080, help='Dev Server Port')
    parser_build.add_argument('-t', '--templates-dir', help='Templates directory', default="templates")
    parser_build.add_argument('-s', '--static-dir', help='Static directory', default="static")

    return parser.parse_args()


def dev_server(args):
    """Start development Server"""
    from flask import Flask, render_template

    app = Flask(__name__)

    @app.route("/")
    @app.route("/<path:subpath>")
    def all_routes(subpath=None):
        if subpath is None:
            subpath = "index"
        subpath = subpath.rstrip("/")
        if os.path.exists(f'templates/{subpath}.html.j2'):
            return render_template(f'{subpath}.html.j2')

        if os.path.exists(f'templates/{subpath}/index.html.j2'):
            return render_template(f'{subpath}/index.html.j2')

        return render_template('404.html.j2')

    app.run(port=args.port, debug=True)


def crawl(path):
    """Crawl the given template directory"""
    paths = []
    for entry in os.listdir(path):
        full_path = os.path.join(path, entry)
        if os.path.isdir(full_path):
            if entry not in ["partials", "layouts"]:
                paths += crawl(full_path)
        else:
            paths.append(full_path)

    return paths


def build(args):
    """Build Static Website from Templates"""
    from jinja2 import Template

    paths = crawl(args.templates_dir)
    for path in paths:
        target_dir = os.path.dirname(path).replace(
            args.templates_dir, args.output_dir
        )
        content = ""
        with open(path) as template_file:
            content = template_file.read()
        bname = os.path.basename(path).replace(".html.j2", "")
        if bname != "index":
            target_dir = os.path.join(target_dir, bname)

        os.makedirs(target_dir, exist_ok=True)
        target_file = os.path.join(target_dir, "index.html")
        with open(target_file, "w") as tfile:
            tfile.write(Template(content).render())
        print(f"{path} => {target_file}")


def main():
    """Main Entry point"""
    args = get_args()
    if args.cmd == "dev":
        dev_server(args)
    elif args.cmd == "build":
        build(args)


if __name__ == "__main__":
    main()
