interface MessageMetadataDto {
	title: string;
	contentId: string;
	path: string;
	language: string;
	playlist?: string;
	size: number;
	position: number;
	variant?: string;
	publisher?: string;
	source?: string;
	relatedId?: string;
	dtbRevision?: string;
	duration?: string;
	recordedAt?: string;
	keywords?: string;
	timing?: string;
	speaker?: string;
	goal?: string;
	transcription?: string;
	notes?: string;
	status?: string;
	category?: string;
}

interface DeploymentMetadataDto {
	project: string;
	deployment: {
		name: string;
		number: number;
	};
	platform: string;
	revision: string;
	createdAt: Date;
	createdBy?: string;
	computerName?: string;
	packages: string[];
	categories: Array<{ id: string; name: string; project: string }>;
	contents: {
		[languageOrVariant: string]: {
			messages: MessageMetadataDto[];
			playlistPrompts: MessageMetadataDto[];
			packageName: string;
		};
	};
	systemPrompts: {
		[languageOrVariant: string]: Array<{
			title: string;
			contentId;
			string;
			path: string;
			language: string;
			size: number;
		}>;
	};

  /**
   * Supposed to be a bool but due to bug in kotlin,
   * it is generated as a string => "true" | "false"
   */
	published: string;
}
