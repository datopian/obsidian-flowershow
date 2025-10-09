export const DEFAULT_SETTINGS: IFlowershowSettings = {
	githubRepo: '',
	githubToken: '',
	githubUserName: '',
	branch: 'main',
}

export interface IFlowershowSettings {
	githubToken: string;
	githubRepo: string;
	githubUserName: string;
	branch: string;
}
