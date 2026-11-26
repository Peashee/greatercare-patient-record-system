import { getUrl, remove, uploadData } from "aws-amplify/storage";
import { client, unwrap } from "./amplify";
import { audit } from "./audit";
import { STATUS } from "./appointments";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const RECORD_FIELDS = [
  "patientName",
  "patientEmail",
  "assessment",
  "diagnosis",
  "treatmentPlan",
  "prescriptions",
  "bloodPressure",
  "heartRate",
  "temperature",
  "weight",
  "followUpDate",
  "doctorEmail",
  "doctorName",
  "appointmentId",
];

function normalise(values) {
  const record = {};
  for (const field of RECORD_FIELDS) {
    let value = values[field];
    if (typeof value === "string") value = value.trim();
    if (["heartRate"].includes(field)) value = value === "" || value == null ? null : Number.parseInt(value, 10);
    if (["temperature", "weight"].includes(field)) value = value === "" || value == null ? null : Number.parseFloat(value);
    record[field] = value === "" || Number.isNaN(value) ? null : value ?? null;
  }
  record.patientEmail = record.patientEmail?.toLowerCase();
  // Keep the legacy `notes` field populated for older clients.
  record.notes = record.assessment;
  return record;
}

async function uploadAttachments(recordId, files, onProgress) {
  const paths = [];
  for (const [index, file] of files.entries()) {
    const safeName = file.name.replace(/[\\/:*?"<>|#%]/g, "_");
    const path = `records/${recordId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    await uploadData({
      path,
      data: file,
      options: {
        contentType: file.type || undefined,
        onProgress: ({ transferredBytes, totalBytes }) =>
          onProgress?.({ file: index + 1, of: files.length, percent: totalBytes ? Math.round((transferredBytes / totalBytes) * 100) : 0 }),
      },
    }).result;
    paths.push(path);
  }
  return paths;
}

/**
 * Creates or amends a clinical record, uploads supporting documents to S3
 * (records/{recordId}/…) and optionally completes the linked appointment.
 */
export async function saveRecord({ id, values, files = [], existingAttachments = [], completeAppointment, onProgress }) {
  const record = normalise(values);
  const saved = id
    ? unwrap(await client.models.PatientRecord.update({ id, ...record }))
    : unwrap(await client.models.PatientRecord.create(record));
  if (!saved) throw new Error("The record could not be saved.");

  if (files.length) {
    const uploaded = await uploadAttachments(saved.id, files, onProgress);
    unwrap(
      await client.models.PatientRecord.update({ id: saved.id, attachments: [...existingAttachments, ...uploaded] }),
      "The record was saved but the documents could not be linked."
    );
  }

  if (completeAppointment && record.appointmentId) {
    unwrap(await client.models.Appointment.update({ id: record.appointmentId, status: STATUS.COMPLETED }));
  }

  await audit(
    id ? "RECORD_AMENDED" : "RECORD_CREATED",
    "RECORD",
    `${id ? "Amended" : "Created"} a clinical record for ${record.patientName}${files.length ? ` with ${files.length} document(s)` : ""}`,
    saved.id
  );
  return saved;
}

export async function deleteRecord(record) {
  for (const path of record.attachments ?? []) {
    try {
      await remove({ path });
    } catch (error) {
      console.warn("Attachment could not be removed:", path, error);
    }
  }
  unwrap(await client.models.PatientRecord.delete({ id: record.id }));
  await audit("RECORD_DELETED", "RECORD", `Deleted a clinical record for ${record.patientName}`, record.id);
}

export async function attachmentLinks(paths = []) {
  return Promise.all(
    paths.map(async (path) => {
      try {
        const { url } = await getUrl({ path, options: { expiresIn: 900 } });
        return { path, url: url.toString() };
      } catch (error) {
        console.warn("Attachment link unavailable:", error);
        return { path, url: "" };
      }
    })
  );
}
