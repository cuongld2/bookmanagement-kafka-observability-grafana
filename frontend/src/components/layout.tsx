import FrontendObservability from "./frontend-observability";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FrontendObservability />
      <main>{children}</main>
    </>
  );
}
