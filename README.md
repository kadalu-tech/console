# console

Web Console for Kadalu Storage

Kadalu Storage Console is a static web app created using [AlpineJS](https://alpinejs.dev/) and [Bulma CSS](https://bulma.io/). Backend HTML files are generated using [Jinja2](https://jinja.palletsprojects.com).

## Setup

Install the build dependencies

```
pip install flask jinja2
```

To try out locally,

```
make dev
```

To deploy, run the following command and copy the `output` directory to Static server location like Github pages.

```
make build
```

To make changes to CSS, download the bulma and install the following dependencies.

```
gem install sass
```
