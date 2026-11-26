import { useState, useEffect } from "react";
import { Button, Text, Heading, Flex, View, Divider } from "@aws-amplify/ui-react";
import { fetchAuthSession } from "aws-amplify/auth";

export default function Appointments({ client, role }) {
  const [appointments, setAppointments] = useState([]);
  const today = new Date().toISOString().split("T")[0];
  const isPatient = role === "PATIENTS";

  useEffect(() => {
    loadAppointments();
  }, []);

  async function getAuth() {
    const session = await fetchAuthSession();
    return {
      authToken: session.tokens?.idToken?.toString(),
      email: session.tokens?.idToken?.payload?.email,
    };
  }

  async function loadAppointments() {
    try {
      const { authToken } = await getAuth();
      const { data, errors } = await client.models.Appointment.list({
        authMode: "userPool",
        authToken,
      });
      if (errors) console.error("List appointments:", errors);
      const sorted = [...(data ?? [])].sort((a, b) =>
        `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
      );
      setAppointments(sorted);
    } catch (error) {
      console.error(error);
    }
  }

  async function bookAppointment(event) {
    event.preventDefault();
    const formElement = event.target;
    const form = new FormData(formElement);
    try {
      const { authToken, email } = await getAuth();
      const { errors } = await client.models.Appointment.create(
        {
          patientName: form.get("patientName"),
          patientEmail: String(email),
          date: form.get("date"),
          time: form.get("time"),
          reason: form.get("reason"),
          status: "PENDING",
        },
        { authMode: "userPool", authToken }
      );
      if (errors) {
        alert("Could not book: " + errors[0].message);
        return;
      }
      formElement.reset();
      await loadAppointments();
    } catch (error) {
      console.error(error);
      alert("Something went wrong: " + error.message);
    }
  }

  async function setStatus(id, status) {
    try {
      const { authToken } = await getAuth();
      const { errors } = await client.models.Appointment.update(
        { id, status },
        { authMode: "userPool", authToken }
      );
      if (errors) alert("Could not update: " + errors[0].message);
      await loadAppointments();
    } catch (error) {
      console.error(error);
      alert("Something went wrong: " + error.message);
    }
  }

  async function removeAppointment(id) {
    try {
      const { authToken } = await getAuth();
      await client.models.Appointment.delete(
        { id },
        { authMode: "userPool", authToken }
      );
      await loadAppointments();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <Flex direction="column" alignItems="center" gap="1rem" width="100%" margin="2rem 0">
      <Divider />
      <Heading level={2}>{isPatient ? "My Appointments" : "Appointments"}</Heading>

      {isPatient && (
        <View as="form" onSubmit={bookAppointment}>
          <Flex direction="column" gap="1rem" padding="1rem">
            <input name="patientName" placeholder="Your full name" required />
            <input name="date" type="date" min={today} required />
            <input name="time" type="time" required />
            <input name="reason" placeholder="Reason for visit" required />
            <Button type="submit" variation="primary">Book appointment</Button>
          </Flex>
        </View>
      )}

      {appointments.length === 0 && <Text>No appointments yet.</Text>}

      {appointments.map((appt) => (
        <Flex
          key={appt.id}
          direction="column"
          alignItems="center"
          gap="0.5rem"
          border="1px solid #ccc"
          padding="1.5rem"
          borderRadius="5%"
        >
          <Heading level={4}>{appt.patientName}</Heading>
          <Text>{appt.date} at {appt.time}</Text>
          <Text fontStyle="italic">{appt.reason}</Text>
          <Text>Status: {appt.status ?? "PENDING"}</Text>
          {!isPatient && (
            <Flex gap="0.5rem">
              <Button size="small" onClick={() => setStatus(appt.id, "CONFIRMED")}>Confirm</Button>
              <Button size="small" onClick={() => setStatus(appt.id, "CANCELLED")}>Cancel</Button>
              <Button size="small" onClick={() => setStatus(appt.id, "COMPLETED")}>Complete</Button>
            </Flex>
          )}
          {role === "ADMINS" && (
            <Button size="small" variation="destructive" onClick={() => removeAppointment(appt.id)}>
              Delete
            </Button>
          )}
        </Flex>
      ))}
    </Flex>
  );
}