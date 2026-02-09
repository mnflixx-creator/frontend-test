import classNames from "classnames";
import { Trans, useTranslation } from "react-i18next";

import { Button } from "@/components/buttons/Button";
import { Icon, Icons } from "@/components/Icon";
import { Stepper } from "@/components/layout/Stepper";
import { BiggerCenterContainer } from "@/components/layout/ThinContainer";
import { VerticalLine } from "@/components/layout/VerticalLine";
import {
  FancyModal,
  Modal,
  ModalCard,
  useModal,
} from "@/components/overlays/Modal";
import { Divider } from "@/components/utils/Divider";
import { Ol } from "@/components/utils/Ol";
import {
  Heading1,
  Heading2,
  Heading3,
  Paragraph,
} from "@/components/utils/Text";
import { MinimalPageLayout } from "@/pages/layouts/MinimalPageLayout";
import {
  useNavigateOnboarding,
  useRedirectBack,
} from "@/pages/onboarding/onboardingHooks";
import {
  Card,
  CardContent,
  Link,
  MiniCardContent,
} from "@/pages/onboarding/utils";
import { PageTitle } from "@/pages/parts/util/PageTitle";
import { conf } from "@/setup/config";
import { usePreferencesStore } from "@/stores/preferences";
import { getProxyUrls } from "@/utils/proxyUrls";

import { DebridEdit, FebboxSetup } from "../parts/settings/ConnectionsPart";

function Item(props: { title: string; children: React.ReactNode }) {
  return (
    <>
      <p className="text-white mb-2 font-medium">{props.title}</p>
      <div className="text-type-text">{props.children}</div>
    </>
  );
}

export function OnboardingPage() {
  const navigate = useNavigateOnboarding();
  const skipModal = useModal("skip");
  const infoModal = useModal("info");
  const { completeAndRedirect } = useRedirectBack();
  const { t } = useTranslation();
  const noProxies = getProxyUrls().length === 0;

  const isSafari =
    typeof navigator !== "undefined" &&
    /Safari/.test(navigator.userAgent) &&
    !/Chrome/.test(navigator.userAgent) &&
    !/Edg/.test(navigator.userAgent);

  return (
    <MinimalPageLayout>
      <PageTitle subpage k="global.pages.onboarding" />
      <Modal id={skipModal.id}>
        <ModalCard>
          <Heading1 className="!mt-0 !mb-4 !text-2xl">
            {t("onboarding.defaultConfirm.title")}
          </Heading1>
          <Paragraph className="!mt-1 !mb-12">
            {t("onboarding.defaultConfirm.description")}
          </Paragraph>
          <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-between">
            <Button theme="secondary" onClick={skipModal.hide}>
              {t("onboarding.defaultConfirm.cancel")}
            </Button>
            <Button theme="purple" onClick={() => completeAndRedirect()}>
              {t("onboarding.defaultConfirm.confirm")}
            </Button>
          </div>
        </ModalCard>
      </Modal>
      <FancyModal
        id={infoModal.id}
        title={t("onboarding.start.moreInfo.title")}
        size="xl"
      >
        <Trans
          i18nKey="onboarding.start.moreInfo.explainer.intro"
          className="pb-4"
        />
        <div className="flex flex-col gap-4 md:flex-row py-8">
          <div className="md:w-1/2">
            <Heading3 className="font-normal">
              <Trans i18nKey="onboarding.start.moreInfo.recommended.title" />
            </Heading3>
            <Trans i18nKey="onboarding.start.moreInfo.recommended.subtitle" />
            <div className="space-y-4 pt-8 bg-mediaCard-hoverAccent/10 rounded-xl p-10 mt-6 mr-2 min-w-[20rem]">
              <Item
                title={t("onboarding.start.moreInfo.recommended.desktop.title")}
              >
                <Trans i18nKey="onboarding.start.moreInfo.recommended.desktop.description" />
              </Item>
              <Item
                title={t("onboarding.start.moreInfo.recommended.iOS.title")}
              >
                <Trans i18nKey="onboarding.start.moreInfo.recommended.iOS.description" />
              </Item>
              <Item
                title={t("onboarding.start.moreInfo.recommended.android.title")}
              >
                <Trans i18nKey="onboarding.start.moreInfo.recommended.android.description" />
              </Item>
            </div>
          </div>
          <div className="inline md:hidden">
            <Divider />
          </div>
          <div>
            <Ol
              items={[
                <Item
                  title={t("onboarding.start.moreInfo.explainer.extension")}
                >
                  {t(
                    "onboarding.start.moreInfo.explainer.extensionDescription",
                  )}
                </Item>,
                <Item title={t("onboarding.start.moreInfo.explainer.proxy")}>
                  {t("onboarding.start.moreInfo.explainer.proxyDescription")}
                </Item>,
                <Item title={t("onboarding.start.moreInfo.explainer.default")}>
                  {t("onboarding.start.moreInfo.explainer.defaultDescription")}
                </Item>,
              ].filter(Boolean)}
            />
            {conf().ALLOW_FEBBOX_KEY && (
              <div className="pt-12 pl-[3.2rem]">
                <Item
                  title={t("onboarding.start.moreInfo.explainer.fedapi.fedapi")}
                >
                  {t(
                    "onboarding.start.moreInfo.explainer.fedapi.fedapiDescription",
                  )}
                </Item>
              </div>
            )}
          </div>
        </div>
        <div>
          <Trans i18nKey="onboarding.start.moreInfo.explainer.outro">
            <a
              href="https://discord.com/invite/7z6znYgrTG"
              target="_blank"
              rel="noopener noreferrer"
              className="text-type-link"
            />
          </Trans>
        </div>
      </FancyModal>
      <BiggerCenterContainer>
        <Stepper steps={2} current={1} className="mb-12" />
        <Heading2 className="!mt-0 !text-3xl">
          {t("onboarding.start.title")}
        </Heading2>
        <Paragraph className="max-w-[360px]">
          {t("onboarding.start.explainer")}
          <div
            className="pt-4 flex cursor-pointer items-center text-type-link"
            onClick={() => infoModal.show()}
          >
            <Trans i18nKey="onboarding.start.moreInfo.button" />
            <Icon className="pl-2" icon={Icons.CIRCLE_QUESTION} />
          </div>
        </Paragraph>

        {/* Desktop Cards */}
        <div className="hidden md:flex w-full flex-col md:flex-row gap-3 pb-6">
          <Card
            onClick={() => navigate("/onboarding/extension")}
            className={classNames(
              conf().HIDE_PROXY_ONBOARDING ? "md:w-1/2" : "md:w-1/3",
            )}
          >
            <CardContent
              colorClass="!text-onboarding-best"
              title={t("onboarding.start.options.extension.title")}
              subtitle={t("onboarding.start.options.extension.quality")}
              description={t("onboarding.start.options.extension.description")}
            >
              <Link className="!text-onboarding-best">
                {t("onboarding.start.options.extension.action")}
              </Link>
            </CardContent>
          </Card>
          {conf().HIDE_PROXY_ONBOARDING ? null : (
            <>
              <div className="hidden md:grid grid-rows-[1fr,auto,1fr] justify-center gap-4">
                <VerticalLine className="items-end" />
                <span className="text-xs uppercase font-bold">
                  {t("onboarding.start.options.or")}
                </span>
                <VerticalLine />
              </div>
              <Card
                onClick={() => navigate("/onboarding/proxy")}
                className="md:w-1/3"
              >
                <CardContent
                  colorClass="!text-onboarding-good"
                  title={t("onboarding.start.options.proxy.title")}
                  subtitle={t("onboarding.start.options.proxy.quality")}
                  description={t("onboarding.start.options.proxy.description")}
                >
                  <Link>{t("onboarding.start.options.proxy.action")}</Link>
                </CardContent>
              </Card>
            </>
          )}
          {noProxies ? null : (
            <>
              <div className="hidden md:grid grid-rows-[1fr,auto,1fr] justify-center gap-4">
                <VerticalLine className="items-end" />
                <span className="text-xs uppercase font-bold">
                  {t("onboarding.start.options.or")}
                </span>
                <VerticalLine />
              </div>
              <Card
                onClick={
                  isSafari
                    ? () => completeAndRedirect() // Skip modal on Safari
                    : skipModal.show // Show modal on other browsers
                }
                className={classNames(
                  conf().HIDE_PROXY_ONBOARDING ? "md:w-1/2" : "md:w-1/3",
                )}
              >
                <CardContent
                  colorClass="!text-onboarding-bad"
                  title={t("onboarding.defaultConfirm.confirm")}
                  subtitle=""
                  description={t("onboarding.defaultConfirm.description")}
                >
                  <Trans i18nKey="onboarding.start.options.default.text" />
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden flex w-full flex-col md:flex-row gap-3 pb-6">
          <Card
            onClick={() => navigate("/onboarding/extension")}
            className="md:w-1/3 md:h-full"
          >
            <MiniCardContent
              colorClass="!text-onboarding-best"
              title={t("onboarding.start.options.extension.title")}
              subtitle={t("onboarding.start.options.extension.quality")}
              description={t("onboarding.start.options.extension.description")}
            />
          </Card>
          {conf().HIDE_PROXY_ONBOARDING ? null : (
            <Card
              onClick={() => navigate("/onboarding/proxy")}
              className="md:w-1/3"
            >
              <MiniCardContent
                colorClass="!text-onboarding-good"
                title={t("onboarding.start.options.proxy.title")}
                subtitle={t("onboarding.start.options.proxy.quality")}
                description={t("onboarding.start.options.proxy.description")}
              />
            </Card>
          )}
          {noProxies ? null : (
            <Card
              onClick={
                isSafari
                  ? () => completeAndRedirect() // Skip modal on Safari
                  : skipModal.show // Show modal on other browsers
              }
              className="md:w-1/3"
            >
              <MiniCardContent
                colorClass="!text-onboarding-bad"
                title={t("onboarding.defaultConfirm.confirm")}
                subtitle=""
                description={t("onboarding.defaultConfirm.description")}
              />
            </Card>
          )}
        </div>

        {(conf().ALLOW_FEBBOX_KEY || conf().ALLOW_DEBRID_KEY) === true && (
          <Heading3 className="text-white font-bold mb-3 mt-6">
            {t("onboarding.start.options.addons.title")}
          </Heading3>
        )}
        <div className="mt-6">
          <FebboxSetup
            febboxKey={usePreferencesStore((s) => s.febboxKey)}
            setFebboxKey={usePreferencesStore((s) => s.setFebboxKey)}
            mode="onboarding"
          />
        </div>
        <div className="mt-6">
          <DebridEdit
            debridToken={usePreferencesStore((s) => s.debridToken)}
            setdebridToken={usePreferencesStore((s) => s.setdebridToken)}
            debridService={usePreferencesStore((s) => s.debridService)}
            setdebridService={usePreferencesStore((s) => s.setdebridService)}
            mode="onboarding"
          />
        </div>
      </BiggerCenterContainer>
    </MinimalPageLayout>
  );
}
