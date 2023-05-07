export const DEFAULT_SETTINGS: FlowershowSettings = {
	githubRepo: '',
	githubToken: '',
	githubUserName: '',
	gardenBaseUrl: '',
	prHistory: [],
	baseTheme: "dark",
	theme: '{"name": "default", "modes": ["dark"]}',
	faviconPath: '',
	noteSettingsIsInitialized: false,
	siteName: 'Digital Garden',
	slugifyEnabled: true,
	// Note Icon Related Settings
	noteIconKey: "dg-note-icon",
	defaultNoteIcon: '',
	showNoteIconOnTitle: false,
	showNoteIconInFileTree: false,
	showNoteIconOnInternalLink: false,
	showNoteIconOnBackLink: false,

	// Timestamp related settings
	showCreatedTimestamp: false,
	createdTimestampKey: "dg-created",
	showUpdatedTimestamp: false,
	updatedTimestampKey: "dg-updated",
	timestampFormat: "MMM dd, yyyy h:mm a",

	styleSettingsCss: '',
	pathRewriteRules: '',

	contentClassesKey: 'dg-content-classes',

	defaultNoteSettings: {
		dgHomeLink: true,
		dgPassFrontmatter: false,
		dgShowBacklinks: false,
		dgShowLocalGraph: false,
		dgShowInlineTitle: false,
		dgShowFileTree: false,
		dgEnableSearch: false,
		dgShowToc: false,
		dgLinkPreview: false,
		dgShowTags: false
	}
}

export interface FlowershowSettings {
	githubToken: string;
	githubRepo: string;
	githubUserName: string;
	gardenBaseUrl: string;
	prHistory: string[];

	theme: string;
	baseTheme: string;
	faviconPath: string;

	siteName: string;

	noteSettingsIsInitialized: boolean;

	slugifyEnabled: boolean;

	noteIconKey: string;
	defaultNoteIcon: string;
	showNoteIconOnTitle: boolean;
	showNoteIconInFileTree: boolean;
	showNoteIconOnInternalLink: boolean;
	showNoteIconOnBackLink: boolean;

	showCreatedTimestamp: boolean;
	createdTimestampKey: string

	showUpdatedTimestamp: boolean;
	updatedTimestampKey: string;

	timestampFormat: string;

	styleSettingsCss: string;
	pathRewriteRules: string;
	contentClassesKey: string;

	defaultNoteSettings: {
		dgHomeLink: boolean;
		dgPassFrontmatter: boolean;
		dgShowBacklinks: boolean;
		dgShowLocalGraph: boolean;
		dgShowInlineTitle: boolean;
		dgShowFileTree: boolean;
		dgEnableSearch: boolean;
		dgShowToc: boolean;
		dgLinkPreview: boolean;
		dgShowTags: boolean;
	}
}
