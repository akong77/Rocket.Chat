import type { IRoom, IUser } from '@rocket.chat/core-typings';
import { useMutableCallback } from '@rocket.chat/fuselage-hooks';
import { escapeHTML } from '@rocket.chat/string-helpers';
import {
	usePermission,
	useSetModal,
	useMethod,
	useToastMessageDispatch,
	useTranslation,
	useUserRoom,
	useUserSubscription,
} from '@rocket.chat/ui-contexts';
import React, { useMemo } from 'react';

import GenericModal from '../../../../../components/GenericModal';
import { roomCoordinator } from '../../../../../lib/rooms/roomCoordinator';
import { getRoomDirectives } from '../../../lib/getRoomDirectives';
import type { UserInfoAction, UserInfoActionType } from '../useUserInfoActions';

export const useMuteUserAction = (
	user: Pick<IUser, '_id' | 'username'> & { isMuted?: boolean },
	rid: IRoom['_id'],
): UserInfoAction | undefined => {
	const t = useTranslation();
	const room = useUserRoom(rid);
	const userCanMute = usePermission('mute-user', rid);
	const dispatchToastMessage = useToastMessageDispatch();
	const setModal = useSetModal();
	const closeModal = useMutableCallback(() => setModal(null));

	const userSubscription = useUserSubscription(rid);

	const isMuted = Boolean(user?.isMuted);
	const roomName = room?.t && escapeHTML(roomCoordinator.getRoomName(room.t, room));

	if (!room) {
		throw Error('Room not provided');
	}

	const { roomCanMute } = getRoomDirectives({ room, showingUserId: user._id, userSubscription });

	const mutedMessage = isMuted ? 'User__username__unmuted_in_room__roomName__' : 'User__username__muted_in_room__roomName__';

	const muteUser = useMethod(isMuted ? 'unmuteUserInRoom' : 'muteUserInRoom');

	const muteUserOption = useMemo(() => {
		const action = (): Promise<void> | void => {
			const onConfirm = async (): Promise<void> => {
				try {
					if (!user.username) {
						throw new Error('User without username');
					}

					await muteUser({ rid, username: user.username });

					return dispatchToastMessage({
						type: 'success',
						message: t(mutedMessage, {
							username: user.username,
							roomName,
						}),
					});
				} catch (error: unknown) {
					dispatchToastMessage({ type: 'error', message: error });
				} finally {
					closeModal();
				}
			};

			if (isMuted) {
				return onConfirm();
			}

			return setModal(
				<GenericModal variant='danger' confirmText={t('Yes_mute_user')} onClose={closeModal} onCancel={closeModal} onConfirm={onConfirm}>
					{t('The_user_wont_be_able_to_type_in_s', roomName)}
				</GenericModal>,
			);
		};

		return roomCanMute && userCanMute
			? {
					content: t(isMuted ? 'Unmute_user' : 'Mute_user'),
					icon: isMuted ? ('mic' as const) : ('mic-off' as const),
					onClick: action,
					type: 'management' as UserInfoActionType,
			  }
			: undefined;
	}, [
		closeModal,
		mutedMessage,
		dispatchToastMessage,
		isMuted,
		muteUser,
		rid,
		roomCanMute,
		roomName,
		setModal,
		t,
		user.username,
		userCanMute,
	]);

	return muteUserOption;
};
