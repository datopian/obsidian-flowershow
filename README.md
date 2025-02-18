# 💐 Obsidian Flowershow Plugin (v2)

Publish your Obsidian vault online easily, quickly and for free directly from your Obsidian vault using [Flowershow](https://flowershow.app).

Note: if were using this plugin before Jan 2025 please read about upgrading from v1 here: https://flowershow.app/blog/upgrade-plugin-to-v2-from-v1

## Getting Started

- Install this plugin 😄
- Sign up for a free account at https://flowershow.app/ and follow the short instructions
- **That's it! Your notes are now ready to be shared with the world! 💐**

Full docs at https://flowershow.app/docs/

### Publication Status Panel

The Flowershow icon in your ribbon opens the Publication Status panel, which shows:

* **Published**: the total number of notes that has been published to your Flowershow site
* **Changed**: the total number of __published__ notes that has been edited locally (+ button to publish them)
* **Unpublished**: the total number of new notes in your Obsidian vault, that has not yet been published to your site (+ button to publish them)
* **Deleted**: the total number of notes that has been deleted from your Obsidian vault, but are still published on your site (+ button to unpublish them)

### Available Commands

* `Flowershow: Publish Single Note` - Publishes the current note to your Flowershow site
* `Flowershow: Publish All Notes` - Publishes all notes in your vault to your Flowershow site

### Frontmatter settings

* `publish` - Set to `false` to keep the note unpublished from your Flowershow site (or unpublish it if it was published before).

More options at https://flowershow.app/docs/

---

## Development

### Local testing

1. Clone the repository.
2. Run `npm i` to install dependencies.
3. Run `npm run build`.
4. Create the plugins directory in your Obsidian vault if it doesn't exist:
```sh
mkdir -p /path/to/obsidian-vault/.obsidian/plugins/flowershow
```
5. Create symlinks to the `main.js`, `manifest.json`, and `styles.css` files in your Obsidian plugins folder:

```sh
ln -s /path/to/obsidian-flowershow/main.js /path/to/obsidian-vault/.obsidian/plugins/flowershow/main.js
ln -s /path/to/obsidian-flowershow/manifest.json /path/to/obsidian-vault/.obsidian/plugins/flowershow/manifest.json
ln -s /path/to/obsidian-flowershow/styles.css /path/to/obsidian-vault/.obsidian/plugins/flowershow/styles.css
```

6. Reload Obsidian, go to Settings > Community Plugins, and enable the plugin.

### Rebuild on change 

If you want to automatically rebuild the plugin after you make any changes to the source code, run `npm run dev` instead of `npm run build`. This will start a server that will watch for changes to the source files and rebuild the plugin automatically. However, you will still need to reload Obsidian manually each time to see the changes.

### Hot reloading

If you want true hot reloading, i.e. without needing to disable/enable the plugin:

1. Install [Hot-Reload](https://github.com/pjeby/hot-reload) plugin:
  - download the .zip file from the latest release
  - extract the .zip file into your Obsidian vault's `.obsidian/plugins` folder
  - go to Settings > Community Plugins and enable the plugin
2. Instead of creating symlinks like in step 4 above, copy/clone the plugin project directly into your Obsidian vault's `.obsidian/plugins` folder:

``` sh
mv /path/to/obsidian-flowershow /path/to/obsidian-vault/.obsidian/plugins/
```

3. Run `npm i && npm run dev` in the plugin folder to start the development server.

Now, whenever you make any changes to the source code, two things will happen:
1. The plugin will be rebuilt automatically.
2. The Hot-Reload plugin will detect that the plugin has been rebuilt and will reload it in Obsidian.

## Shoutout

Big thanks to [Ole Eskild Steensen](https://github.com/oleeskild) for [his obsidian-digital-garden plugin](https://github.com/oleeskild/obsidian-digital-garden/tree/main) which inspired us and we got to build on.
