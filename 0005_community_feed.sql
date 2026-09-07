CREATE TABLE `communityPosts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `authorUserId` int NOT NULL,
  `body` text NOT NULL,
  `mediaUrl` varchar(768),
  `commentsEnabled` boolean NOT NULL DEFAULT true,
  `visibility` enum('community','connections','private') NOT NULL DEFAULT 'community',
  `moderationStatus` enum('pending','approved','removed') NOT NULL DEFAULT 'approved',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `communityPosts_pk` PRIMARY KEY (`id`),
  CONSTRAINT `communityPosts_author_fk` FOREIGN KEY (`authorUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
CREATE INDEX `community_posts_feed_idx` ON `communityPosts` (`moderationStatus`, `visibility`, `createdAt`);
CREATE INDEX `community_posts_author_idx` ON `communityPosts` (`authorUserId`, `createdAt`);

CREATE TABLE `communityReactions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `postId` int NOT NULL,
  `userId` int NOT NULL,
  `emoji` varchar(16) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `communityReactions_pk` PRIMARY KEY (`id`),
  CONSTRAINT `communityReactions_post_fk` FOREIGN KEY (`postId`) REFERENCES `communityPosts`(`id`) ON DELETE CASCADE,
  CONSTRAINT `communityReactions_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `community_reactions_user_post_emoji_unique` UNIQUE (`postId`, `userId`, `emoji`)
);
CREATE INDEX `community_reactions_post_idx` ON `communityReactions` (`postId`);

CREATE TABLE `communityComments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `postId` int NOT NULL,
  `authorUserId` int NOT NULL,
  `body` text NOT NULL,
  `moderationStatus` enum('approved','removed') NOT NULL DEFAULT 'approved',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `communityComments_pk` PRIMARY KEY (`id`),
  CONSTRAINT `communityComments_post_fk` FOREIGN KEY (`postId`) REFERENCES `communityPosts`(`id`) ON DELETE CASCADE,
  CONSTRAINT `communityComments_author_fk` FOREIGN KEY (`authorUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
CREATE INDEX `community_comments_post_idx` ON `communityComments` (`postId`, `createdAt`);