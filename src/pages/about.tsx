/* eslint-disable react/no-unescaped-entities */
import { Spinner } from "@/interface/loading/spinner";
import type { NextPageWithLayout } from "@/layout";
import { Layout } from "@/layout";
import { tw } from "@/styles/tw";
import {
  Item,
  Content as RContent,
  Header as RHeader,
  Root,
  Trigger,
} from "@radix-ui/react-accordion";
import Head from "next/head";
import type { PropsWithChildren } from "react";
import { Fragment } from "react";
import RightIcon from "~icons/formkit/right";
import style from "./about.module.css";

const contentStyle = style.content!;

const Page: NextPageWithLayout = () => {
  return (
    <Root
      type="multiple"
      className="h-fit grow divide-y-2 divide-neutral-400/15 overflow-hidden rounded-lg bg-neutral-100"
    >
      <Info />
      <HowTo />
      <Loading />
      <Scanner />
      <Offline />
      <MadeBy />
    </Root>
  );
};

function Info() {
  return (
    <Item value="info">
      <Header>What is Recallio</Header>
      <Content>
        <p>
          Have you ever found yourself at a grocery aisle, unsure you've already tried a product or
          if you've even liked it?
        </p>
        <p>That's the exact problem I had which inspired me to create Recallio.</p>
        <p>
          It's an app which helps you manage your grocery notes and easily find them just by
          scanning a barcode on the label.
        </p>
      </Content>
    </Item>
  );
}

function HowTo() {
  return (
    <Item value="how-to">
      <Header>How to use it</Header>
      <Content>
        <p>To leave a review for a product, press a button at the bottom center of the page.</p>
        <p>
          You can either scan the barcode directly in the app, upload an image of it or input
          barcode UPC directly using the label usually written below the barcode.
        </p>
        <p>After a successful scan, you will be redirected to the review page.</p>
        <p>
          If you haven't reviewed this product yet, instead you will be redirected to a new review
          page.
        </p>
      </Content>
    </Item>
  );
}

function Loading() {
  return (
    <Item value="loading">
      <Header>Pending actions</Header>
      <Content>
        <div className="float-right ml-1 size-10 rounded-full bg-neutral-400/20 p-1">
          <Spinner className="size-full contrast-200" />
        </div>
        <p>
          Whenever you see this icon in the bottom right corner of the screen - it means that an
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
          For the best results keep the barcode straight in front of the camera and make sure it is
          well-lit. The scanner works best with black and white barcodes.
        </p>
        <p>
          Some platforms provide a native barcode detection feature which usually yields optimal
          results.
        </p>
        <p>
          Recallio will attempt to use native detection first. If it's unsupported it will switch to
          a custom one.
        </p>
        <p>You can check if your platform supports native barcode detection in the link below</p>
        <ExternalLink href="https://caniuse.com/mdn-api_barcodedetector">
          Supported platforms
        </ExternalLink>
      </Content>
    </Item>
  );
}

function Offline() {
  return (
    <Item value="offline">
      <Header>Offline access</Header>
      <Content>
        <p>
          Enabling offline access in the settings will download the app locally to your device. This
          allows you to navigate the app even when offline.
        </p>
        <p>
          Your reviews will be saved locally as well - you may access them by navigating to a review
          page for a specific barcode.
        </p>
        <p>
          However most of the data will be unavailable since it requires internet access. This
          includes a list of your reviews on profile page.
        </p>
        <p>
          You may edit data while offline - however if you exit the app before restoring connection
          that data will be lost. The app will try to save your edits as soon as you restore online
          access.
        </p>
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
                  label: "linkedin",
                  href: "https://www.linkedin.com/in/huge-letters/",
                },
                {
                  label: "telegram",
                  href: "https://t.me/HugeLetters",
                },
                {
                  label: "github",
                  href: "https://github.com/HugeLetters",
                },
              ]}
            />
          </li>
          <li>
            designed by:
            <Author
              name="Azalia Khamatova"
              socials={[
                {
                  label: "linkedin",
                  href: "https://www.linkedin.com/in/azaliya-khamatova-b991a3272/",
                },
                {
                  label: "telegram",
                  href: "https://t.me/AzaliaKham",
                },
              ]}
            />
          </li>
        </ul>
      </Content>
    </Item>
  );
}

type AuthorProps = { name: string; socials?: ReadonlyArray<{ href: string; label: string }> };
function Author({ name, socials }: AuthorProps) {
  const last = socials?.at(-1);
  return (
    <div className="pl-2">
      {name}
      {!!socials?.length && (
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
      )}
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
      <div className="p-3 *:mb-1 last:*:mb-0">{children}</div>
    </RContent>
  );
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
