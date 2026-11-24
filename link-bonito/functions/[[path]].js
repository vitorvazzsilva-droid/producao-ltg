// Endereço bonito: tudo que chega em esteiraltg.pages.dev vai pro Worker producao-ltg, pela service binding APP.
export const onRequest = ({ request, env }) => env.APP.fetch(request);
