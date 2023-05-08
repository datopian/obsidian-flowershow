# 🌷 Obsidian Flowershow Plugin

Obsidian Flowershow plugin for publishing with [Flowershow](https://github.com/datopian/flowershow) direct from your Obsidian vault.

## Docs

### Initial Setup

1. Firstly, you will need a GitHub account. If you don't have it yet, create one [here](https://github.com/signup).
2. You'll also need a Vercel account. You can sign up using your GitHub account [here](https://vercel.com/signup)
3. Open [this repo](https://github.com/datopian/flowershow-template), and click the blue "Deploy" button under "Quick clone and deploy" section. This will open Vercel's "Create Git Repository" page. Pick a name for your site's repository and click "Create", to create a copy of the template repository in your GitHub account and deploy it to Vercel.
4. Now you need to create a personal access token on GitHub, so that the plugin can add/delete notes to/from the repo. Go to [this page](https://github.com/settings/tokens/new?scopes=repo) while logged in to GitHub. The correct settings should already be applied. If you don't want to generate this every few months, choose the "No expiration" option. Click the "Generate token" button, and copy the token you are presented with on the next page. 
5. In Obsidian open Flowershow plugin settings. Fill in your GitHub username, the name of the repo with your notes which you created in step 3. Lastly paste the token you created in step 4.
6. Now, let's publish your first note! Create a new note in Obsidian.
7. Open your command pallete by pressing CTRL+P on Windows/Linux (CMD+P on Mac) and find the "Flowershow: Publish Single Note" command. Press enter.
8. Go to your site's URL which you should find on [Vercel](https://vercel.com/dashboard). If nothing shows up yet, wait a minute and refresh. Your Flowershow site with the note you just created should now be up and running.

Congratulations, you now have your own Flowershow site, hosted free of charge! 
You can now start adding links as you usually would in Obisidan, with double square brackets like this: [[Some Other Note]], to the note that you just published. You can also link to a specific header by using the syntax [[Some Other Note#A Header]]. Remember to also publish the notes your are linking to as this will not happen automatically. 

### Commands

* `Flowershow: Publish Single Note` - Publishes the current note to your Flowershow site.
* `Flowershow: Publish All Notes` - Publishes all notes in your vault to your Flowershow site.

### Frontmatter settings

* `isDraft` - Set to `true` to keep the note unpublished from your Flowershow site (or unpublish it if it was published before). Default: `false`.

## Development

### Local testing

1. Clone the repository.
2. Run `npm i` to install dependencies.
3. Run `npm run build`.
4. Create symlinks to the `main.js`, `manifest.json`, and `styles.css` files in your Obsidian plugins folder:

``` sh
ln -s /path/to/obsidian-flowershow/main.js /path/to/obsidian-vault/.obsidian/plugins/flowershow/main.js
ln -s /path/to/obsidian-flowershow/manifest.json /path/to/obsidian-vault/.obsidian/plugins/flowershow/manifest.json
ln -s /path/to/obsidian-flowershow/styles.css /path/to/obsidian-vault/.obsidian/plugins/flowershow/styles.css
```

5. Reload Obsidian, go to Settings > Community Plugins, and enable the plugin.

### Rebuild on change 

If you want to automatically rebuild the plugin after you make any changes to the source code, run `npm run dev` instead of `npm run build`. This will start a server that will watch for changes to the source files and rebuild the plugin automatically. However, you will still need to reload Obsidian manually each time to see the changes.

### Hot reloading

If you want true hot reloading, i.e. without needing to disable/enable the plugin:

1. Install [Hot-Reload](https://github.com/pjeby/hot-reload) plugin:
  - download the .zip file from the latest release
  - extract the .zip file into your Obsidian vault's `.obsidian/plugins` folder
  - go to Settings > Community Plugins and enable the plugin
2. Instead of creating symlinks like in step 4 above, copy the plugin files directly into your Obsidian vault's `.obsidian/plugins` folder:

``` sh
mv /path/to/obsidian-flowershow /path/to/obsidian-vault/.obsidian/plugins/
```

3. Run `npm run dev` to start the server.

Now, whenever you make any changes to the source code, two things will happen:
1. The plugin will be rebuilt automatically.
2. The Hot-Reload plugin will detect that the plugin has been rebuilt and will reload it in Obsidian.

