import { Button } from "@react-email/button";
import { render } from "@react-email/render";
import { Row } from "@react-email/row";
import { Section } from "@react-email/section";
import { Tailwind } from "@react-email/tailwind";
import config from "../../../tailwind.config";

type EmailProps = { token: string; url: string };
function Email({ token, url }: EmailProps) {
  return (
    <Tailwind config={{ theme: config.theme }}>
      <Section className="p-4">
        <Section className="rounded-lg bg-neutral-200 p-4 text-xl text-[rgb(26_46_5)]">
          <Row>{"Here's your authorization pin"}</Row>
          <Row>{token}</Row>
          <Button
            href={url}
            className="rounded-lg bg-app-green p-3 text-white"
          >
            Or click me to sign in
          </Button>
        </Section>
      </Section>
    </Tailwind>
  );
}

export function getEmailHtml(opts: EmailProps) {
  return render(<Email {...opts} />);
}

export function getEmailText({ token, url }: EmailProps) {
  return `Here's your authorization pin - ${token}\nOr you may use this link to sign in\n${url}`;
}
