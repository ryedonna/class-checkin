/** One teacher entering one class. */
export type CheckIn = {
  /** Unique per check-in: `${timestamp}-${className}` */
  key: string;
  teacher: string;
  className: string;
  subject: string;
  /** Epoch ms when the class QR was scanned on the phone (= time entered) */
  t: number;
  sent: boolean;
  failed?: boolean;
};

/** Saved once on the teacher's phone. */
export type Profile = {
  teacher: string;
  /** The subjects this teacher teaches; only these are offered after a scan */
  subjects: string[];
  /** If on, the last subject used for a class is recorded automatically after a short countdown */
  autoConfirm: boolean;
};

export type Tone = 'idle' | 'ok' | 'warn' | 'bad';

export type Status = { text: string; tone: Tone };

export type ApiResult = {
  ok: boolean;
  message: string;
  duplicate?: boolean;
};
