export const DEFAULT_SETTINGS: FlowershowSettings = {
	githubRepo: '',
	githubToken: '',
	githubUserName: '',
}

export interface FlowershowSettings {
	githubToken: string;
	githubRepo: string;
	githubUserName: string;
}
