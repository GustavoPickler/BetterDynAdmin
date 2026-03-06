import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Better Dynamo Administration v3 (TypeScript)',
        namespace: 'BetterDynAdmin',
        version: '3.1.0',
        description: 'Refreshing ATG Dyn Admin',
        author: 'Gustavo Pickler',
        match: ['*/dyn/admin/*'],
        include: ['*/dyn/admin/*'],
        grant: [
          'GM_getResourceText',
          'GM_getResourceURL',
          'GM_addStyle',
          'GM_setClipboard',
          'GM_getValue',
          'GM_setValue',
          'GM_deleteValue',
          'GM_info',
          'window.focus',
        ],
        require: [
          'https://code.jquery.com/jquery-3.7.1.min.js',
          'https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/jquery.tablesorter/2.31.3/js/jquery.tablesorter.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/xml/xml.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/hint/show-hint.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/hint/xml-hint.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/js/select2.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/vis/4.21.0/vis.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/notify/0.4.2/notify.min.js',
          'https://twitter.github.io/typeahead.js/releases/latest/typeahead.bundle.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/jquery.textcomplete/1.8.5/jquery.textcomplete.min.js',
        ],
        resource: {
          bootstrapCSS: 'https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css',
          cmCSS: 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.css',
          tablesorterCSS: 'https://cdnjs.cloudflare.com/ajax/libs/jquery.tablesorter/2.31.3/css/theme.blue.min.css',
          hljsThemeCSS: 'https://raw.githubusercontent.com/GustavoPickler/BetterDynAdmin/master/lib/highlight.js/github_custom.css',
          hlCSS: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css',
          select2CSS: 'https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/css/select2.min.css',
          fontAwesomeCSS: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css',
          visCSS: 'https://cdnjs.cloudflare.com/ajax/libs/vis/4.21.0/vis.min.css',
          cmHint: 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/hint/show-hint.css',
          whatsnew: 'https://raw.githubusercontent.com/GustavoPickler/BetterDynAdmin/master/WHATSNEW.md',
        },
        homepage: 'https://github.com/GustavoPickler/BetterDynAdmin',
        supportURL: 'https://github.com/GustavoPickler/BetterDynAdmin/issues',
        updateURL: 'https://raw.githubusercontent.com/GustavoPickler/BetterDynAdmin/master/dist/better-dyn-admin.user.js',
        downloadURL: 'https://raw.githubusercontent.com/GustavoPickler/BetterDynAdmin/master/dist/better-dyn-admin.user.js',
      },
      build: {
        externalGlobals: {
          // jQuery is already loaded via @require CDN - map import to global $
          jquery: ['$', (version) => `https://code.jquery.com/jquery-${version}.min.js`],
        },
      },
    }),
  ],
  build: {
    outDir: 'dist',
  },
});
