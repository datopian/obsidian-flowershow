export const DEFAULT_SETTINGS: FlowershowSettings = {
	githubRepo: '',
	githubToken: '',
	githubUserName: '',
	notesRepoPath: '',
	assetsRepoPath: ''
}

export interface FlowershowSettings {
	githubToken: string;
	githubRepo: string;
	githubUserName: string;
	notesRepoPath: string;
	assetsRepoPath: string;
}
