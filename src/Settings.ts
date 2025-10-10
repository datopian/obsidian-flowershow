export const DEFAULT_SETTINGS: IFlowershowSettings = {
	githubRepo: '',
	githubToken: '',
	githubUserName: '',
	branch: 'main',
	autoMergePullRequests: false,
	mergeCommitMessage: 'Merge content updates',
}

export interface IFlowershowSettings {
	githubToken: string;
	githubRepo: string;
	githubUserName: string;
	branch: string;
	autoMergePullRequests: boolean;
	mergeCommitMessage: string;
}
