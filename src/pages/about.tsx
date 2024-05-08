import { Spinner } from "@/interface/loading/spinner";
import type { NextPageWithLayout } from "@/layout";
import { Layout } from "@/layout";
import { tw } from "@/styles/tw";
import {
  Content as RContent,
  Header as RHeader,
  Item as RItem,
  Root,
  Trigger,
} from "@radix-ui/react-accordion";
import Head from "next/head";
import type { PropsWithChildren } from "react";
import { Fragment } from "react";
import RightIcon from "~icons/formkit/right";
import style from "./about.module.css";

const contentStyle = style.content!;

// todo - what is this app
// ? todo - offline indicator

const Page: NextPageWithLayout = () => {
  return (
    <Root
      type="multiple"
      className="h-fit grow divide-y-2 divide-neutral-400/15 overflow-hidden rounded-lg bg-neutral-100"
    >
      <Loading />
      <Scanner />
      <MadeBy />
    </Root>
  );
};

function Loading() {
  return (
    <Item value="loading">
      <Header>Pending actions</Header>
      <Content>
        <div className="float-right size-10 rounded-full bg-neutral-400/20 p-1">
          <Spinner className="size-full contrast-200" />
        </div>
        <p>
          Whenever you see this icon at the bottom right corner of the screen - it indicates that an
          action is currently in progress.
        </p>
        <p>Please keep the page open until it disappears.</p>
        <p>Otherwise, some unsaved data may be lost.</p>
      </Content>
    </Item>
  );
}

function Scanner() {
  return (
    <Item value="scanner">
      <Header>Scanning barcodes</Header>
      <Content>
        <p>
          For best results keep the barcode straight in front of the camera and make sure it is well
          lit.
        </p>
        <p>The scanner works best with black and white barcodes.</p>
        <p>
          Some platforms provide a native barcode detection solution which usually provides best
          results.
        </p>
        <p>
          The app will try to use native solution and if it{"'"}s unsupported will fall back to a
          custom one.
        </p>
        <p>You can check if your platform supports native barcode detection in the link below</p>
        <ExternalLink href="https://caniuse.com/mdn-api_barcodedetector">
          Supported platforms
        </ExternalLink>
      </Content>
    </Item>
  );
}

function MadeBy() {
  return (
    <Item value="author">
      <Header>Who made this app?</Header>
      <Content>
        <ul className="flex flex-col gap-1">
          <li>
            developed by:
            <Author
              name="Eugene Perminov"
              socials={[
                {
                  label: "github",
                  href: "https://github.com/HugeLetters",
                },
                {
                  label: "telegram",
                  href: "https://t.me/HugeLetters",
                },
              ]}
            />
          </li>
          {/* todo - awaiting azalia socials */}
          <li>
            designed by:
            <Author
              name="Azalia Kham"
              socials={[
                {
                  label: "github",
                  href: "https://github.com/HugeLetters",
                },
                {
                  label: "telegram",
                  href: "https://t.me/HugeLetters",
                },
              ]}
            />
          </li>
        </ul>
      </Content>
    </Item>
  );
}

type AuthorProps = { name: string; socials: ReadonlyArray<{ href: string; label: string }> };
function Author({ name, socials }: AuthorProps) {
  const last = socials.at(-1);
  return (
    <div className="pl-2">
      {name}
      <div className="pl-2">
        socials:{" "}
        {socials.map((social) => {
          const isLast = social === last;
          const link = (
            <ExternalLink
              key={social.label}
              href={social.href}
            >
              {social.label}
            </ExternalLink>
          );

          if (isLast) return link;
          return <Fragment key={social.label}>{link}, </Fragment>;
        })}
      </div>
    </div>
  );
}

type HeaderProps = PropsWithChildren;
function Header({ children }: HeaderProps) {
  return (
    <RHeader asChild>
      <Trigger className="group flex w-full items-center justify-between p-2 outline-none transition-colors focus-visible:bg-app-green-100">
        <h2>{children}</h2>
        <RightIcon className="transition-transform group-data-[state=open]:rotate-90" />
      </Trigger>
    </RHeader>
  );
}

type ContentProps = PropsWithChildren;
function Content({ children }: ContentProps) {
  return (
    <RContent className={tw("bg-neutral-200", contentStyle)}>
      <div className="p-3">{children}</div>
    </RContent>
  );
}

type ItemProps = PropsWithChildren<{ value: string }>;
function Item({ children, value }: ItemProps) {
  return <RItem value={value}>{children}</RItem>;
}

type ExternalLinkProps = PropsWithChildren<{ href: string }>;
function ExternalLink({ href, children }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      className="text-app-green-750 underline"
    >
      {children}
    </a>
  );
}

Page.getLayout = (children) => (
  <Layout header={{ title: "About" }}>
    <Head>
      <title>about</title>
    </Head>
    {children}
  </Layout>
);

Page.isPublic = true;

export default Page;
