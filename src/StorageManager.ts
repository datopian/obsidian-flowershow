import axios from "axios";
import { FlowershowSettings } from "src/FlowershowSettings";
import { generateBlobHash } from "./utils";
import { validateSettings } from "./Validator";

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
        // TODO merge this with uploadtToR2 method in Publisher
        if (!validateSettings(settings)) {
            throw {}
        }

        const settingsJSON = JSON.stringify(settings);
        const hash = generateBlobHash(settingsJSON);

        try {
            await axios.put(`${settings.R2url}config.json`, {
                markdown: settingsJSON // TODO this is not markdown
            }, {
                headers: {
                    "X-Content-SHA256": hash,
                    "Content-Type": "application/json"
                }
            });
        } catch {
            throw {}
        }
    }

    // get hashes of all the notes and images stored in R2
    async getObjectsHashes(): Promise<PathToHashDict> {
        // TODO this will only get max 1000 objects, need to implement pagination
        const response = await axios.get(`${this.R2WorkerUrl}`);
        // TODO types
        const objects: Array<any> = response.data.objects;

        const hashes: PathToHashDict = objects.reduce((dict: PathToHashDict, note) => {
            if (note.key === "config.json") {
                return dict
            }
            dict[note.key] = note.checksums.sha256;
            return dict
        }, {});

        return hashes;
    }
}
