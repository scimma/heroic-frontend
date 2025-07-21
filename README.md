# heroic-frontend

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development
* You may need to update the `.env` file to point to your HEROIC backend server - it points to `http://127.0.0.1:8000/api/` by default.

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Deployment

Set the following environment variables:
* VITE_HEROIC_URL - backend url with trailing slash, defaults to 'http://127.0.0.1:8000/'
* VITE_SIMBAD2K_API_URL - simbad2k service url, defaults to LCO's at 'https://simbad2k.lco.global/'
