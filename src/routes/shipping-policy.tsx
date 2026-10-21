import {createFileRoute} from '@tanstack/react-router';
import {PolicyPage,policyHead} from '@/components/site/PolicyPage';
export const Route=createFileRoute('/shipping-policy')({head:()=>policyHead('Shipping policy','Get Xpress packaging, serviceability, pickup and delivery policy.'),component:()=> <PolicyPage title='Shipping policy' sections={[
['Serviceability','Pickup and delivery eligibility is based on the active pincode service area and, once connected, courier partner availability. A Get Xpress hub does not have to exist locally for an eligible third-party pickup or delivery.'],
['Parcel preparation','Pack each physical parcel securely and provide accurate weight, dimensions, contents and address details. Each physical parcel receives its own piece identifier under a master AWB.'],
['Delivery estimates','Available service speeds and prices are shown at booking. Estimates depend on serviceability, partner acceptance, transport conditions and the recipient being available.'],
['Tracking and returns','Scan events update the shipment status. Incorrect addresses, refusal or unsuccessful delivery can lead to a return request and additional transport charges.'],
['Restricted items','Do not book prohibited, illegal or hazardous items. Contact support before sending fragile, high-value or restricted goods. Detailed liability and coverage terms require business approval.']
]}/>});
