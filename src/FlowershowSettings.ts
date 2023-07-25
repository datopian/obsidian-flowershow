export const DEFAULT_SETTINGS: FlowershowSettings = {
	// Storage config
	R2url: "",
	// Flowershow config
	title: "",
	description: "",
	author: "",
	logo: "",
	// domain: "https://my-flowershow.app",
	navbarTitle: {
		logo: "",
		text: "",
		version: "",
	},
	editLinkRoot: "",
	showEditLink: false,
	showToc: true,
	showSidebar: false,
	showComments: false,
	comments: {
		provider: "giscus", // supported providers: giscus, utterances, disqus
		pages: ["blog"], // page directories where we want commments
		config: {
			repo: "",
			repositoryId: "",
			category: "",
			categoryId: "",
		},
	},
	// analytics: "",
	navLinks: [],
	social: [],
	// search: {
	// 	provider: "algolia",
	// 	config: {
	// 		appId: process.env.NEXT_PUBLIC_DOCSEARCH_APP_ID,
	// 		apiKey: process.env.NEXT_PUBLIC_DOCSEARCH_API_KEY,
	// 		indexName: process.env.NEXT_PUBLIC_DOCSEARCH_INDEX_NAME,
	// 	},
	// },
	// nextSeo: {
	// 	titleTemplate: "%s | Flowershow",
	// 	description:
	// 		"Turn your markdown notes into an elegant website and tailor it to your needs. Flowershow is easy to use, fully-featured, Obsidian compatible and open-source.",
	// 	canonical: "https://flowershow.app",
	// 	openGraph: {
	// 		title: "Flowershow",
	// 		images: [
	// 			{
	// 				url: "https://flowershow.app/assets/images/frontpage-screenshot.jpg",
	// 				alt: "Flowershow",
	// 				width: 1200,
	// 				height: 627,
	// 				type: "image/jpg",
	// 			},
	// 		],
	// 	},
	// 	twitter: {
	// 		handle: "@flowershow",
	// 		site: "https://flowershow.app",
	// 		cardType: "summary_large_image",
	// 	},
	// },
}

export interface FlowershowSettings {
	// Storage config
	R2url: string,
	// Flowershow config
	title: string,
	description: string,
	author: string,
	logo: string, // path to logo relative to content folder
	// domain: string,
	navbarTitle: {
		logo: string,
		text: string,
		version: string,
	},
	editLinkRoot: string, // e.g. "https://github.com/datopian/flowershow-app/edit/main",
	showEditLink: boolean,
	showToc: boolean,
	showSidebar: boolean,
	showComments: boolean,
	comments: {
		provider: "giscus" | "utterances" | "disqus" | null,
		pages: Array<string>, // page directories where commments should be enabled
		config: any, // provider specific config
	},
	// analytics: string, // Google Analytics ID, e.g. "UA-XXXXX-X"
	navLinks: Array<{ href: string, name: string }>,
	social: Array<{ href: string, label: string }>,
	// search: {
	// 	provider: "algolia" | "kbar",
	// 	config: any, // provider specific config
	// },
	// nextSeo: {
	// 	titleTemplate: string,
	// 	description: string,
	// 	canonical: string,
	// 	openGraph: {
	// 		title: string,
	// 		images: Array<{
	// 			url: string,
	// 			alt: string,
	// 			width: number,
	// 			height: number,
	// 			type: string,
	// 		}>
	// 	},
	// 	twitter: {
	// 		handle: string,
	// 		site: string,
	// 		cardType: string,
	// 	},
	// },
}
