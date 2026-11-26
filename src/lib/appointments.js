import { client, unwrap } from "./amplify";
import { audit } from "./audit";
import { formatDate } from "./format";

export const VISIT_TYPES = ["In person", "Video call", "Phone call", "Follow-up"];

export const STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

const describe = (appointment) =>
  `${appointment.patientName} on ${formatDate(appointment.date)} at ${appointment.time}`;

export async function createAppointment(values, { requestedBy }) {
  const created = unwrap(
    await client.models.Appointment.create({
      ...values,
      patientEmail: values.patientEmail.toLowerCase(),
      status: values.doctorEmail ? STATUS.CONFIRMED : STATUS.PENDING,
    })
  );
  await audit(
    requestedBy === "PATIENTS" ? "APPOINTMENT_REQUESTED" : "APPOINTMENT_SCHEDULED",
    "APPOINTMENT",
    `${requestedBy === "PATIENTS" ? "Requested" : "Scheduled"} a visit for ${describe(values)}`,
    created?.id
  );
  return created;
}

/**
 * Claims an unassigned request. The DynamoDB condition guarantees that if two
 * doctors press "Take" at the same moment only one write succeeds.
 */
export async function claimAppointment(appointment, doctor) {
  unwrap(
    await client.models.Appointment.update(
      { id: appointment.id, doctorEmail: doctor.email, doctorName: doctor.name, status: STATUS.CONFIRMED },
      {
        condition: {
          and: [
            { status: { eq: STATUS.PENDING } },
            { or: [{ doctorEmail: { attributeExists: false } }, { doctorEmail: { eq: null } }] },
          ],
        },
      }
    ),
    "Another clinician has already taken this appointment."
  );
  await audit("APPOINTMENT_CLAIMED", "APPOINTMENT", `Took the visit for ${describe(appointment)}`, appointment.id);
}

export async function assignAppointment(appointment, doctor) {
  unwrap(
    await client.models.Appointment.update({
      id: appointment.id,
      doctorEmail: doctor?.email ?? null,
      doctorName: doctor?.name ?? null,
      status: doctor ? STATUS.CONFIRMED : STATUS.PENDING,
    })
  );
  await audit(
    "APPOINTMENT_ASSIGNED",
    "APPOINTMENT",
    doctor ? `Assigned ${doctor.name} to ${describe(appointment)}` : `Unassigned ${describe(appointment)}`,
    appointment.id
  );
}

export async function setAppointmentStatus(appointment, status) {
  unwrap(await client.models.Appointment.update({ id: appointment.id, status }));
  await audit(`APPOINTMENT_${status}`, "APPOINTMENT", `Marked ${describe(appointment)} as ${status.toLowerCase()}`, appointment.id);
}

export async function deleteAppointment(appointment) {
  unwrap(await client.models.Appointment.delete({ id: appointment.id }));
  await audit("APPOINTMENT_DELETED", "APPOINTMENT", `Deleted the visit for ${describe(appointment)}`, appointment.id);
}
