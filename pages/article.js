import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Web3Modal from "web3modal"
import { useRouter } from 'next/router'
import matter from 'gray-matter'
// import ReactMarkdown from "react-markdown"
import ReactMarkdown from 'react-markdown/react-markdown.min';

import {
  nftmarketaddress, nftaddress
} from '../config'

// const hre = require("hardhat");

import NFT from '../artifacts/contracts/NFT.sol/NFT.json'
import Market from '../artifacts/contracts/Market.sol/NFTMarket.json'

import { providers } from "ethers";
import { init } from "@textile/eth-storage";

let ethAccount
let myethAccount
let cid
let nft = {}
export default function MyAssets() {
  // const [nft, setNft] = useState({})
  const [loadingState, setLoadingState] = useState('not-loaded')
  const router = useRouter()
  console.log(router) // pathname: '/', route: '/', asPath: '/'
  if (router.pathname == '/article') {
    if (typeof document !== 'undefined') {
      var els = document.getElementsByClassName("_nav");
      Array.prototype.forEach.call(els, function(el) {
          el.classList.remove('current');
      });
    }
  }

  async function createMint() {
    /* first, upload to IPFS */
    try {
      const url = `https://ipfs.infura.io/ipfs/${cid}`
      console.log('!nft.minted', !nft.minted)
      /* after file is uploaded to IPFS, pass the URL to save it on Polygon */
      createSale(url)
    } catch (error) {
      console.log('Error uploading file: ', error)
    }
  }

  async function storeNFTtoFilecoin() {
    await window.ethereum.enable();
    const provider = new providers.Web3Provider(window.ethereum);
    const wallet = provider.getSigner();

    const storage = await init(wallet);
    // const blob = new Blob(["Hello, world!"], { type: "text/plain" });
    const jsonse = JSON.stringify(nft);
    const blob = new Blob([jsonse], {type: "application/json"});
    const file = new File([blob], "welcome.txt", {
      type: "text/plain",
      lastModified: new Date().getTime()
    });
    try{
      await storage.addDeposit(); // "execution reverted: BridgeProvider: depositee already has deposit"
    } catch  (error) {
      console.error(error);
    }

    const { id, cid } = await storage.store(file);
    const { request, deals } = await storage.status(id);

    console.log('id, cid, request, deals', id, cid, request, deals)
    console.log(request.status_code);

    console.log([...deals]);
    console.log('stored~')
    alert('Your NFT has been stored on Filecoin Network~')
  }

  async function createSale(url) {
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()

    /* next, create the item */
    let contract = new ethers.Contract(nftaddress, NFT.abi, signer)
    console.log(NFT.abi)
    console.log(signer)
    console.log("signer")
    console.log(contract)
    let transaction = await contract.createToken(url)
    console.log(transaction)
    let tx = await transaction.wait()

    let event = tx.events[0]
    console.log(tx)
    console.log(event)
    // console.log(event.getBlock())
    // console.log(event.getTransaction())
    // console.log(event.getTransactionReceipt())
    let value = event.args[2]
    let tokenId = value.toNumber()

    const price = ethers.utils.parseUnits('0.1', 'ether')
    /* then list the item for sale on the marketplace */
    contract = new ethers.Contract(nftmarketaddress, Market.abi, signer)
    let listingPrice = await contract.getListingPrice()
    listingPrice = listingPrice.toString()
    transaction = await contract.createMarketItem(nftaddress, tokenId, price, { value: listingPrice })
    await transaction.wait()
  }

  if (typeof window !== 'undefined') {
      myethAccount = localStorage.getItem("ethAccount");
      console.log('myethAccount', myethAccount)
  }

  console.log(router.query)
  console.log(nft)
  console.log(loadingState != 'loaded', !nft)

  // const { cid } = router.query
  // console.log(cid)
  if (loadingState != 'loaded' && !('name' in nft)) {
    loadNFT()
  }

  useEffect(() => {
    loadNFT()
  }, [])

  async function loadNFT() {
    console.log(router.query)
    // const dweb_search_url = `https://dweb-search-api.anwen.cc/get_meta?cid=${cid}`
    if ('cid' in router.query){
      cid = router.query.cid
      console.log('cid', cid)
    }
    console.log('cid2', cid)
    if (!cid) {
      return
    }
    const ipfs_gateway_url = `https://ipfs.infura.io/ipfs/${cid}`
    const ret = await axios.get(ipfs_gateway_url) // TODO
    console.log(ret)
    // authors[0].name
    if ('data' in ret) {
      // const { data, content } = matter(ret.data.description)
      // console.log('data, content')
      // console.log(data, content)
      // const result = await remark().use(html).process(content);
      // ret.data.description = result.toString()
      console.log(ret.data.description)
      // useEffect(() => { setNft(ret.data) }, [])
      nft = ret.data
      console.log('nft.minted', nft.minted)
      console.log('aname', ret.data.authors[0].name)
    }
    setLoadingState('loaded')
  }

  if (loadingState != 'loaded' && !('name' in nft)) return (
    <h1 className="py-10 px-20 text-3xl"></h1>
  )
  if (loadingState === 'loaded' && !('name' in nft)) return (
    <h1 className="py-10 px-20 text-3xl">No creation</h1>
  )
  return (
    <div className="flex justify-center">
      <div className="p-4">
              <div className="border shadow rounded-xl overflow-hidden">
                <img src={nft.image} className="rounded" />
                <div className="p-4">
                  <p style={{ height: '64px' }} className="text-3xl font-semibold flex justify-center">{nft.name}</p>
                  <div className="markdown">
                  <ReactMarkdown escapeHtml={true}>{nft.description}</ReactMarkdown>
                  </div>
                  <p>By: 
                  <a href={"/articles?author="+nft.authors[0].wallet.eth} >{nft.authors[0].name}</a>
                  &nbsp;&nbsp;&nbsp;&nbsp;Author-Wallet: {nft.authors[0].wallet.eth}
                  </p>

                  <p>Tags: {nft.tags}</p>
                  <p>License: <a href={nft.license_url}>{nft.license}</a></p>

                  {!('minted' in nft) && (nft.authors[0].wallet.eth==myethAccount) &&
                    <button onClick={createMint} className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg">
                      Mint (Will sign 2 times. Be patient...)
                    </button>
                  }
                  <br/>
                  {(nft.authors[0].wallet.eth==myethAccount) &&
                    <button onClick={storeNFTtoFilecoin} className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg">
                      Store NFT on the Filecoin network(optional)
                    </button>
                  }

                </div>
              </div>
      </div>
    </div>

  )

}