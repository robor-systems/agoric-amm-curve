package vpurse

import (
	"encoding/json"
	stdlog "log"

	"github.com/gorilla/mux"
	"github.com/grpc-ecosystem/grpc-gateway/runtime"
	"github.com/spf13/cobra"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vpurse/types"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/codec"
	cdctypes "github.com/cosmos/cosmos-sdk/codec/types"
	"github.com/cosmos/cosmos-sdk/types/module"

	sdk "github.com/cosmos/cosmos-sdk/types"
	abci "github.com/tendermint/tendermint/abci/types"
)

// type check to ensure the interface is properly implemented
var (
	_ module.AppModule      = AppModule{}
	_ module.AppModuleBasic = AppModuleBasic{}
)

// app module Basics object
type AppModuleBasic struct {
	cdc codec.Marshaler
}

func (AppModuleBasic) Name() string {
	return ModuleName
}

func (AppModuleBasic) RegisterLegacyAminoCodec(cdc *codec.LegacyAmino) {
	RegisterCodec(cdc)
}

// RegisterInterfaces registers the module's interface types
func (b AppModuleBasic) RegisterInterfaces(registry cdctypes.InterfaceRegistry) {
	types.RegisterInterfaces(registry)
}

// DefaultGenesis returns default genesis state as raw bytes for the deployment
func (AppModuleBasic) DefaultGenesis(cdc codec.JSONMarshaler) json.RawMessage {
	return cdc.MustMarshalJSON(DefaultGenesisState())
}

// Validation check of the Genesis
func (AppModuleBasic) ValidateGenesis(cdc codec.JSONMarshaler, config client.TxEncodingConfig, bz json.RawMessage) error {
	var data types.GenesisState
	if err := cdc.UnmarshalJSON(bz, &data); err != nil {
		return err
	}
	return ValidateGenesis(&data)
}

// Register rest routes
func (AppModuleBasic) RegisterRESTRoutes(ctx client.Context, rtr *mux.Router) {
}

func (AppModuleBasic) RegisterGRPCGatewayRoutes(_ client.Context, _ *runtime.ServeMux) {
}

// GetTxCmd implements AppModuleBasic interface
func (AppModuleBasic) GetTxCmd() *cobra.Command {
	return nil
}

// GetQueryCmd implements AppModuleBasic interface
func (AppModuleBasic) GetQueryCmd() *cobra.Command {
	return nil
}

type AppModule struct {
	AppModuleBasic
	keeper Keeper
}

// NewAppModule creates a new AppModule Object
func NewAppModule(k Keeper) AppModule {
	am := AppModule{
		AppModuleBasic: AppModuleBasic{},
		keeper:         k,
	}
	return am
}

func (AppModule) Name() string {
	return ModuleName
}

// BeginBlock implements the AppModule interface
func (am AppModule) BeginBlock(ctx sdk.Context, req abci.RequestBeginBlock) {
}

// EndBlock implements the AppModule interface
func (am AppModule) EndBlock(ctx sdk.Context, req abci.RequestEndBlock) []abci.ValidatorUpdate {
	events := ctx.EventManager().GetABCIEventHistory()
	addressToBalance := make(map[string]sdk.Coins, len(events)*2)

	ensureBalanceIsPresent := func(address string) error {
		if _, ok := addressToBalance[address]; ok {
			return nil
		}
		account, err := sdk.AccAddressFromBech32(address)
		if err != nil {
			return err
		}
		coins := am.keeper.GetAllBalances(ctx, account)
		addressToBalance[address] = coins
		return nil
	}

	/* Scan for all the events matching (taken from cosmos-sdk/x/bank/spec/04_events.md):

	### MsgSend

	| Type     | Attribute Key | Attribute Value    |
	| -------- | ------------- | ------------------ |
	| transfer | recipient     | {recipientAddress} |
	| transfer | sender        | {senderAddress}    |
	| transfer | amount        | {amount}           |
	| message  | module        | bank               |
	| message  | action        | send               |
	| message  | sender        | {senderAddress}    |

	### MsgMultiSend

	| Type     | Attribute Key | Attribute Value    |
	| -------- | ------------- | ------------------ |
	| transfer | recipient     | {recipientAddress} |
	| transfer | sender        | {senderAddress}    |
	| transfer | amount        | {amount}           |
	| message  | module        | bank               |
	| message  | action        | multisend          |
	| message  | sender        | {senderAddress}    |
	*/
	for _, event := range events {
		switch event.Type {
		case "transfer":
			for _, attr := range event.GetAttributes() {
				switch string(attr.GetKey()) {
				case "recipient", "sender":
					address := string(attr.GetValue())
					if err := ensureBalanceIsPresent(address); err != nil {
						stdlog.Println("Cannot ensure vpurse balance for", address, err)
					}
				}
			}
		}
	}

	// Dump all the addressToBalances entries to SwingSet.
	bz, err := marshalBalanceUpdate(addressToBalance)
	if err != nil {
		panic(err)
	}
	if bz != nil {
		_, err := am.CallToController(ctx, string(bz))
		if err != nil {
			panic(err)
		}
	}

	return []abci.ValidatorUpdate{}
}

// RegisterInvariants implements the AppModule interface
func (AppModule) RegisterInvariants(ir sdk.InvariantRegistry) {
	// TODO
}

// Route implements the AppModule interface
func (am AppModule) Route() sdk.Route {
	return sdk.NewRoute(RouterKey, NewHandler(am.keeper))
}

// QuerierRoute implements the AppModule interface
func (AppModule) QuerierRoute() string {
	return ModuleName
}

// LegacyQuerierHandler implements the AppModule interface
func (am AppModule) LegacyQuerierHandler(*codec.LegacyAmino) sdk.Querier {
	return nil
}

// RegisterServices registers module services.
func (am AppModule) RegisterServices(cfg module.Configurator) {
	tx := &types.UnimplementedMsgServer{}
	types.RegisterMsgServer(cfg.MsgServer(), tx)
}

// InitGenesis performs genesis initialization for the ibc-transfer module. It returns
// no validator updates.
func (am AppModule) InitGenesis(ctx sdk.Context, cdc codec.JSONMarshaler, data json.RawMessage) []abci.ValidatorUpdate {
	var genesisState types.GenesisState
	cdc.MustUnmarshalJSON(data, &genesisState)
	return InitGenesis(ctx, am.keeper, &genesisState)
}

// ExportGenesis returns the exported genesis state as raw bytes for the ibc-transfer
// module.
func (am AppModule) ExportGenesis(ctx sdk.Context, cdc codec.JSONMarshaler) json.RawMessage {
	gs := ExportGenesis(ctx, am.keeper)
	return cdc.MustMarshalJSON(gs)
}
