import Notification from '../models/Notification.js';
import {
  sendDonorAcceptedEmail,
  sendDonorShortlistedEmail,
  sendRequestCompletedEmail,
} from './emailService.js';

async function createNotification({ userId, type, title, body, data = {}, sendEmail = null }) {
  const notification = await Notification.create({
    user: userId,
    type,
    title,
    body,
    data,
    emailSent: false,
  });

  if (sendEmail) {
    try {
      await sendEmail();
      notification.emailSent = true;
      await notification.save();
    } catch (error) {
      console.warn(`Notification email failed for ${type}:`, error.message);
    }
  }

  return notification;
}

export async function notifyDonorShortlisted({ donor, request, match }) {
  return createNotification({
    userId: donor._id,
    type: 'donor_shortlisted',
    title: 'Emergency request matched your donor profile',
    body: `${request.requiredType.toUpperCase()} request for ${request.bloodGroup} with ${request.urgencyLevel} urgency.`,
    data: {
      requestId: request._id,
      matchId: match._id,
      requiredType: request.requiredType,
      bloodGroup: request.bloodGroup,
      organType: request.organType || null,
      urgencyLevel: request.urgencyLevel,
    },
    sendEmail:
      donor.email && process.env.EMAIL_USER
        ? () => sendDonorShortlistedEmail(donor.email, donor.name, request.urgencyLevel)
        : null,
  });
}

export async function notifyMatchAccepted({ request, donor, requester, patient, hospitalUser }) {
  const recipients = [
    requester?._id ? { userId: requester._id, email: requester.email, name: requester.name } : null,
    patient?._id ? { userId: patient._id, email: patient.email, name: patient.name } : null,
    hospitalUser?._id
      ? { userId: hospitalUser._id, email: hospitalUser.email, name: hospitalUser.name }
      : null,
  ].filter(Boolean);

  const uniqueRecipients = recipients.filter(
    (recipient, index, list) =>
      list.findIndex((candidate) => candidate.userId.toString() === recipient.userId.toString()) === index
  );

  await Promise.all(
    uniqueRecipients.map((recipient) =>
      createNotification({
        userId: recipient.userId,
        type: 'request_matched',
        title: 'A donor accepted the emergency request',
        body: `${donor.name} accepted the ${request.requiredType} request.`,
        data: {
          requestId: request._id,
          donorId: donor._id,
          donorName: donor.name,
        },
        sendEmail:
          recipient.email && process.env.EMAIL_USER
            ? () => sendDonorAcceptedEmail(recipient.email, recipient.name)
            : null,
      })
    )
  );
}

export async function notifyDonationCompleted({ request, requester, patient, donor, success }) {
  const recipients = [
    requester?._id ? { userId: requester._id, email: requester.email, name: requester.name } : null,
    patient?._id ? { userId: patient._id, email: patient.email, name: patient.name } : null,
    donor?._id ? { userId: donor._id, email: donor.email, name: donor.name } : null,
  ].filter(Boolean);

  const uniqueRecipients = recipients.filter(
    (recipient, index, list) =>
      list.findIndex((candidate) => candidate.userId.toString() === recipient.userId.toString()) === index
  );

  await Promise.all(
    uniqueRecipients.map((recipient) =>
      createNotification({
        userId: recipient.userId,
        type: success ? 'donation_completed' : 'donation_cancelled',
        title: success ? 'Donation recorded successfully' : 'Request was cancelled',
        body: success
          ? 'The hospital confirmed that the donation was completed.'
          : request.cancellationReason || 'The request was closed before completion.',
        data: {
          requestId: request._id,
          status: request.status,
          success,
        },
        sendEmail:
          recipient.email && process.env.EMAIL_USER
            ? () => sendRequestCompletedEmail(recipient.email, recipient.name, success)
            : null,
      })
    )
  );
}
