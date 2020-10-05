import { Component } from '@angular/core';
import detectEthereumProvider from '@metamask/detect-provider';
import { ethers } from 'ethers';
import { TradeTrustErc721Factory, TitleEscrowFactory } from '@govtechsg/token-registry';
import { wrapDocument } from '@govtechsg/open-attestation';
import {deployAndWait} from "@govtechsg/document-store";

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
				url: 'https://devdltledger.dlt.sg:8085/'
			},
			recipient: {
				name: ''
			},
			issuers: []
		};
		this.enableEthereum()
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
		}
	}

	async tokenReg() {
		const factory = new TradeTrustErc721Factory(this.signer);
		this.tokenRegistry = await factory.deploy("MY_TOKEN_REGISTRY_1", "TKN");
		console.log('========tokenRegistry==============',this.tokenRegistry, '====================');
	}

	async titleEscrow() {
		const factory = new TitleEscrowFactory(this.signer);
		const signerAddress = await this.signer.getAddress();
		this.escrowTitleInstance = await factory.deploy(this.formData.tokenRegistryAddress,
								this.formData.ownerAddress, this.formData.holderAddress, signerAddress);
		this.wrappDocument();

		// const documentStore = await deployAndWait("My Document Store", this.signer).then(console.log);
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
		a.download = "wrappedDocument.tt";
		a.click();
		this.issueDocument();
	}

	async issueDocument() {
		let counter = 0;
		const gasPrice = await this.signer.provider.getGasPrice();
		const connectedErc721 = await TradeTrustErc721Factory.connect(this.formData.tokenRegistryAddress, this.signer);
		const merkleRoot = '0x' + this.wrappedDocument.signature.merkleRoot;
		console.log('======= escrowTitleInstance.address ===', this.escrowTitleInstance.address);
		console.log('======= merkleRoot ===', merkleRoot);
		const issueData = await connectedErc721["safeMint(address,uint256)"](this.escrowTitleInstance.address, merkleRoot, { gasPrice: gasPrice.mul(1) });
		console.log('======= issueData===', issueData);
		
		try {
			const waitResp = await issueData.wait();
			console.log('======= waitResp===', waitResp);
		} catch (error) {
			counter++;
			if(counter <= 3) {
				this.issueDocument();
			}
			console.log('======= waitResp===', error);
		}
	}
}
