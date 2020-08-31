import { Component } from '@angular/core';
import detectEthereumProvider from '@metamask/detect-provider';
import { ethers } from 'ethers';
import { TradeTrustErc721Factory, TitleEscrowFactory } from '@govtechsg/token-registry';
import { wrapDocument } from '@govtechsg/open-attestation';

declare let window: any;

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css']
})
export class AppComponent {
	title = 'tt-sample-repo';
	ethereum: any = window.ethereum;
	signer: any = {};
	tokenRegistry: any;
	escrowTitleInstance: any;
	fileParamsData: any = {};
	documentTTData: any = {};
	documentJson: any = {};
	wrappedDocument: any;
	formData: any = {};

	ngOnInit() {
		this.documentJson = {
			$template: {
				name: 'main',
				type: 'EMBEDDED_RENDERER',
				url: 'https://tutorial-renderer.openattestation.com'
			},
			recipient: {
				name: ''
			},
			issuers: []
		};
	}

	enableEthereum() {
		this.ethereum.request({ method: 'eth_requestAccounts' });
		this.connectToMetamask();
	}

	async connectToMetamask() {
		const provider = await detectEthereumProvider();
		if (provider) {

			this.startApp(provider); // Initialize your app

		} else {
			console.log('Please install MetaMask!');
		}
	}

	startApp(provider) {
		// If the provider returned by detectEthereumProvider is not the same as
		// window.ethereum, something is overwriting it, perhaps another wallet.
		if (provider !== this.ethereum) {
			console.error('Do you have multiple wallets installed?');
		} else {
			const provider = new ethers.providers.Web3Provider(this.ethereum);
			this.signer = provider.getSigner();
			this.titleEscrow();
		}
	}

	async titleEscrow() {
		const factory = new TitleEscrowFactory(this.signer);
		const signerAddress = await this.signer.getAddress();
		this.escrowTitleInstance = await factory.deploy(this.formData.tokenRegistryAddress,
								this.formData.ownerAddress, this.formData.holderAddress, signerAddress);
		this.wrappDocument();
	}

	wrappDocument() {
		this.documentJson.recipient = {
			name: this.formData.recipientName
		};
		let issuerData: any = {};
		issuerData.name = this.formData.issuerName;
		issuerData.tokenRegistry = this.formData.tokenRegistryAddress;
		issuerData.identityProof = {
			type: 'DNS-TXT',
			location: this.formData.dnsName
		};
		this.documentJson.issuers = [];
		this.documentJson.issuers.push(issuerData);
	
		this.wrappedDocument = wrapDocument(this.documentJson);
		const blob = new Blob([JSON.stringify(this.wrappedDocument)], { type: 'application/json' });
		var url = URL.createObjectURL(blob);
		var a = document.createElement('a');
		a.href = url;
		a.download = "wrappedDocument.json";
		a.click();
		this.issueDocument();
	}

	async issueDocument() {
		const connectedErc721 = await TradeTrustErc721Factory.connect(this.formData.tokenRegistryAddress, this.signer);
		const merkleRoot = '0xf21e6b5f637f44026410ab3a47384567abc3097b39b58d830950dfec2d8638b9';
		const issueData = await connectedErc721["safeMint(address,uint256)"](this.escrowTitleInstance.address, merkleRoot, {});
		console.log('======= issueData===');
		console.log(issueData);
	}
}
