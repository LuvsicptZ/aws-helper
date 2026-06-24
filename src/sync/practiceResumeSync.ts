import type { PracticeResume } from "../domain/practiceResume";
import { mergePracticeResume } from "../domain/practiceResume";

type SyncPracticeResumeInput = {
  localResume: PracticeResume;
  remoteResume?: PracticeResume;
  saveLocalResume: (resume: PracticeResume) => Promise<void>;
  saveRemoteResume: (resume: PracticeResume) => Promise<void>;
};

export async function syncPracticeResume({
  localResume,
  remoteResume,
  saveLocalResume,
  saveRemoteResume,
}: SyncPracticeResumeInput): Promise<PracticeResume> {
  const mergedResume = remoteResume
    ? mergePracticeResume(localResume, remoteResume)
    : localResume;

  await saveLocalResume(mergedResume);
  await saveRemoteResume(mergedResume);

  return mergedResume;
}
