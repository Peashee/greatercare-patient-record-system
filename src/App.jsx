import { useState, useEffect } from "react";
import {
  Authenticator,
  Button,
  Text,
  TextField,
  Heading,
  Flex,
  View,
  Image,
  Grid,
  Divider,
} from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css";
import { fetchAuthSession } from "aws-amplify/auth";
import { getUrl, uploadData } from "aws-amplify/storage";
import { generateClient } from "aws-amplify/data";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);
const client = generateClient({ authMode: "userPool" });

function Dashboard({ signOut }) {
  const [role, setRole] = useState(null);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    loadRole();
  }, []);

  async function loadRole() {
    const session = await fetchAuthSession({ forceRefresh: true });
    const groups =
      session.tokens?.accessToken?.payload["cognito:groups"] ?? [];
    let current = "NONE";
    if (groups.includes("ADMINS")) current = "ADMINS";
    else if (groups.includes("DOCTORS")) current = "DOCTORS";
    else if (groups.includes("PATIENTS")) current = "PATIENTS";
    setRole(current);
    if (current !== "NONE") fetchRecords(current);
  }

  async function fetchRecords(currentRole = role) {
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();
    const { data, errors } = await client.models.PatientRecord.list({
      authMode: "userPool",
      authToken: idToken,
    });
    if (errors) console.error("List errors:", errors);
    const withImages = await Promise.all(
      data.map(async (record) => {
        if (record.image && currentRole !== "PATIENTS") {
          try {
            const link = await getUrl({
              path: `records/${record.id}/${record.image}`,
            });
            return { ...record, imageUrl: link.url.toString() };
          } catch (error) {
            console.error("Could not load image:", error);
          }
        }
        return record;
      })
    );
    setRecords(withImages);
  }

  async function createRecord(event) {
    event.preventDefault();
    const formElement = event.target;
    const form = new FormData(formElement);
    const file = form.get("image");
    const hasFile = file && file.name;

    try {
      const { data: created, errors } =
        await client.models.PatientRecord.create({
          patientName: form.get("patientName"),
          patientEmail: form.get("patientEmail").trim().toLowerCase(),
          notes: form.get("notes"),
          image: hasFile ? file.name : undefined,
        });

      if (errors || !created) {
        console.error("Create failed:", errors);
        alert("Could not save the record: " + (errors?.[0]?.message ?? "unknown error"));
        return;
      }

      if (hasFile) {
        await uploadData({
          path: `records/${created.id}/${file.name}`,
          data: file,
        }).result;
      }

      await fetchRecords();
      formElement.reset();
    } catch (error) {
      console.error(error);
      alert("Something went wrong: " + error.message);
    }
  }

  async function deleteRecord({ id }) {
    try {
      await client.models.PatientRecord.delete({ id });
      await fetchRecords();
    } catch (error) {
      console.error(error);
      alert("Could not delete the record: " + error.message);
    }
  }

  if (role === null) {
    return <Text>Loading...</Text>;
  }

  if (role === "NONE") {
    return (
      <Flex direction="column" alignItems="center" gap="1rem" margin="3rem auto">
        <Heading level={2}>Account awaiting a role</Heading>
        <Text>
          Your account has no role yet. Ask an administrator to assign one, then sign out and sign in again.
        </Text>
        <Button onClick={signOut}>Sign Out</Button>
      </Flex>
    );
  }

  const isStaff = role === "ADMINS" || role === "DOCTORS";

  return (
    <Flex
      className="App"
      justifyContent="center"
      alignItems="center"
      direction="column"
      width="70%"
      margin="0 auto"
    >
      <Heading level={1}>Greatercare Patient Record Management System</Heading>
      <Text fontStyle="italic">Signed in as: {role.slice(0, -1).toLowerCase()}</Text>

      {isStaff && (
        <View as="form" margin="3rem 0" onSubmit={createRecord}>
          <Flex direction="column" gap="1.5rem" padding="2rem">
            <TextField name="patientName" placeholder="Patient name" label="Patient name" labelHidden variation="quiet" required />
            <TextField name="patientEmail" placeholder="Patient email" label="Patient email" labelHidden variation="quiet" required />
            <TextField name="notes" placeholder="Clinical notes" label="Clinical notes" labelHidden variation="quiet" />
            <input name="image" type="file" accept="image/png, image/jpeg" />
            <Button type="submit" variation="primary">Create Record</Button>
          </Flex>
        </View>
      )}

      <Divider />
      <Heading level={2}>{role === "PATIENTS" ? "My Records" : "Patient Records"}</Heading>

      <Grid margin="3rem 0" autoFlow="column" justifyContent="center" gap="2rem" alignContent="center">
        {records.map((record) => (
          <Flex
            key={record.id}
            direction="column"
            alignItems="center"
            gap="1rem"
            border="1px solid #ccc"
            padding="2rem"
            borderRadius="5%"
            className="box"
          >
            <Heading level="3">{record.patientName}</Heading>
            <Text fontStyle="italic">{record.notes}</Text>
            {record.imageUrl && (
              <Image src={record.imageUrl} alt={`Attachment for ${record.patientName}`} style={{ width: 400 }} />
            )}
            {role === "ADMINS" && (
              <Button variation="destructive" onClick={() => deleteRecord(record)}>
                Delete record
              </Button>
            )}
          </Flex>
        ))}
      </Grid>

      <Button onClick={signOut}>Sign Out</Button>
    </Flex>
  );
}

export default function App() {
  return (
    <Authenticator>
      {({ signOut }) => <Dashboard signOut={signOut} />}
    </Authenticator>
  );
}