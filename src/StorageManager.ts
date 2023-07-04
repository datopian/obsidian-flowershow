import axios from "axios";
import { FlowershowSettings } from "src/FlowershowSettings";

export type PathToHashDict = { [key: string]: string };

export interface IStorageManager {
    getObjectsHashes(): Promise<{ [key: string]: string }>;
    updateConfigFile(settings: FlowershowSettings): Promise<void>;
}

export default class StorageManager implements IStorageManager {
    private R2WorkerUrl: string;

    constructor(R2WorkerUrl: string) {
        this.R2WorkerUrl = R2WorkerUrl;
    }

    async updateConfigFile(settings: FlowershowSettings) {
        // TODO implement
        // 1. save to config.mjs
        // 2. send to R2
    }

    // get hashes of all the notes and images stored in R2
    async getObjectsHashes(): Promise<PathToHashDict> {
        // TODO this will only get max 1000 objects, need to implement pagination
        const response = await axios.get(`${this.R2WorkerUrl}`);
        // TODO types
        const objects: Array<any> = response.data.objects;

        const hashes: PathToHashDict = objects.reduce((dict: PathToHashDict, note) => {
            dict[note.key] = note.checksums.sha256;
            return dict
        }, {});

        return hashes;
    }
}
