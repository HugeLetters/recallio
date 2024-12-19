import { Button } from "@react-email/button";
import { Container } from "@react-email/container";
import { Preview } from "@react-email/preview";
import { render } from "@react-email/render";
import { Row } from "@react-email/row";
import { Tailwind } from "@react-email/tailwind";
import { Text } from "@react-email/text";
import config from "../../../tailwind.config";
import { TOKEN_DURATION_MIN } from "./token";

type EmailProps = { token: string; url: string };
function Email({ token, url }: EmailProps) {
  return (
    <Tailwind config={{ theme: config.theme }}>
      <Container
        style={{
          borderColor: "#4EB151",
          background: "linear-gradient(to bottom right, #4EB151 55%, #95D097)",
        }}
        className="rounded-lg border border-solid p-4 text-xl"
      >
        <Preview>Recallio authorization pin</Preview>
        <Text
          style={{ color: "white" }}
          className="text-center text-2xl"
        >
          {"Here's your authorization pin"}
        </Text>
        <Row className="w-fit">
          <Text
            style={{ color: "#4EB151", background: "#FFFFFF" }}
            className="w-[10rem] rounded-lg text-center font-mono text-3xl font-bold leading-[2lh] tracking-widest"
          >
            {token}
          </Text>
        </Row>
        <Text
          style={{ color: "white" }}
          className="text-center text-lg"
        >
          It will expire in {TOKEN_DURATION_MIN} minutes
        </Text>
        <Row className="w-fit">
          <Button
            href={url}
            style={{ borderColor: "#3E8E41", background: "#4EB151" }}
            className="w-[16rem] rounded-lg border-2 border-solid text-center text-lg leading-[1.5lh] text-white"
          >
            Or click here to sign in
          </Button>
        </Row>
        {/* forces not to show trimmed content */}
        <div className="hidden">{Date.now()}</div>
      </Container>
    </Tailwind>
  );
}

export function getEmailHtml(opts: EmailProps) {
  return render(<Email {...opts} />);
}

export function getEmailText({ token, url }: EmailProps) {
  return `Here's your authorization pin - ${token}\nIt will expire in ${TOKEN_DURATION_MIN} minutes.\nOr you may use this link to sign in\n${url}`;
}
