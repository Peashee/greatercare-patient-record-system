import { RouterProvider } from "react-router";
import "./lib/amplify";
import { AuthProvider } from "./context/AuthContext";
import { FeedbackProvider } from "./context/FeedbackContext";
import { router } from "./router";

export default function App() {
  return (
    <AuthProvider>
      <FeedbackProvider>
        <RouterProvider router={router} />
      </FeedbackProvider>
    </AuthProvider>
  );
}
