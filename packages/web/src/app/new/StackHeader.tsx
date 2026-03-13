"use client";

import { ComingSoonModal, useComingSoonModal } from "@/components/ComingSoonModal";
import { CLOUD_ENABLED } from "@/lib/cloud";
import { ClawexaModal } from "./ClawexaModal";
import { DownloadInstructions } from "./DownloadInstructions";
import { ErrorBanners } from "./ErrorBanners";
import { HeaderActions } from "./HeaderActions";
import { useStackBuilder } from "./StackBuilderProvider";

export function StackHeader() {
	const {
		generateError,
		resolverError,
		downloadComplete,
		setDownloadComplete,
		lastDownloadOptions,
		projectName,
		setShowDeployToServerModal,
		setShowClawexaModal,
	} = useStackBuilder();

	const comingSoon = useComingSoonModal();

	return (
		<>
			<HeaderActions />

			<ErrorBanners generateError={generateError} resolverError={resolverError} />

			{downloadComplete ? (
				<DownloadInstructions
					projectName={projectName}
					deploymentType={lastDownloadOptions?.deploymentType}
					platform={lastDownloadOptions?.platform}
					onDismiss={() => setDownloadComplete(false)}
					onDeployToServer={() => setShowDeployToServerModal(true)}
					onDeployClawexa={() => (CLOUD_ENABLED ? setShowClawexaModal(true) : comingSoon.open())}
				/>
			) : null}

			<ClawexaModal />
			<ComingSoonModal open={comingSoon.isOpen} onClose={comingSoon.close} />
		</>
	);
}
