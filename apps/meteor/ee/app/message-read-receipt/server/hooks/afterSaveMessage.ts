import type { IRoom, IMessage } from '@rocket.chat/core-typings';
import { isEditedMessage, isOmnichannelRoom } from '@rocket.chat/core-typings';
import { Subscriptions } from '@rocket.chat/models';

import { notifyOnSubscriptionChangedByUserAndRoomId } from '../../../../../app/lib/server/lib/notifyListener';
import { callbacks } from '../../../../../lib/callbacks';
import { ReadReceipt } from '../../../../server/lib/message-read-receipt/ReadReceipt';

callbacks.add(
	'afterSaveMessage',
	async (message: IMessage, room: IRoom) => {
		// skips this callback if the message was edited
		if (isEditedMessage(message)) {
			return message;
		}

		if (!isOmnichannelRoom(room) || !room.closedAt) {
			// set subscription as read right after message was sent
			(await Subscriptions.setAsReadByRoomIdAndUserId(room._id, message.u._id)).modifiedCount &&
				void notifyOnSubscriptionChangedByUserAndRoomId(message.u._id, room._id);
		}

		// mark message as read as well
		await ReadReceipt.markMessageAsReadBySender(message, room, message.u._id);

		return message;
	},
	callbacks.priority.MEDIUM,
	'message-read-receipt-afterSaveMessage',
);
