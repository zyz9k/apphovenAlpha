import { Component, OnInit, OnDestroy, NgZone } from "@angular/core";

const firebase = require("nativescript-plugin-firebase/app");
import { firestore } from "nativescript-plugin-firebase";

// import firebase = require("nativescript-plugin-firebase");
import { PageRoute } from "nativescript-angular/router";
import { Observable as RxObservable } from 'rxjs/Observable';
import { HttpService, BackendService, PieceService } from "../../../shared";
import { Page } from "ui/page";
import * as application from "application";
import { AndroidApplication, AndroidActivityBackPressedEventData } from "application";
import { Router } from "@angular/router";
import { RouterExtensions } from "nativescript-angular/router";
import dialogs = require("ui/dialogs");
import { SwissArmyKnife } from "nativescript-swiss-army-knife";

@Component({
    selector: "ah-piece-db",
    templateUrl: "pages/piece/piece-dashboard/piece-dashboard.component.html",
    styleUrls: ["pages/piece/piece-dashboard/piece-dashboard-common.css"]
})

export class PieceDashboardComponent implements OnInit, OnDestroy {

    public routerParamId: Array<any>;
    public myItems: RxObservable<Array<any>>;

    public pieceMovementArray: Array<any>;
    public pieceMovementArrayNotSelected: Array<any>;
    public pieceMovementArrayAll: Array<any>;
    public selectedArray: Array<any>;

    public toggleButtonText = "Edit Practice-List";
    public showRemainingMovements: boolean = false;

    // Icons
    public iconRemove = String.fromCharCode(0xf1f8);
    public iconAdd = String.fromCharCode(0xf067);

    public randomImage;

    // Nativescript doesn't allow an easy way to render an object, 
    // which is created while loading the values from firebase. Therefore: Each value gets an own var
    public pieceId: string;
    public pieceTitle: string;
    public pieceWorkNumber: string;
    public pieceMovementAmount: number;
    public pieceComposer: string;

    // Observables
    private listenerUnsubscribe: () => void;

    constructor(private _pageRoute: PageRoute, private _page: Page, private _routerExtensions: RouterExtensions, 
        private _router: Router, private _ngZone: NgZone, private _pieceService: PieceService,
        private _httpService: HttpService) {

        this.pieceMovementArray = [];
        this.pieceMovementArrayNotSelected = [];
        this.pieceMovementArrayAll = [];
        this.selectedArray = [];
        this.routerParamId = [];

        this._pageRoute.activatedRoute
        .switchMap(activatedRoute => activatedRoute.params)
        .forEach((params) => { 
            // Deprecated: Working with Parameter
            this.routerParamId['pieceId'] = params['pieceId'];

            this.pieceId = params['pieceId'];
            this.routerParamId['originType'] = Number(params['originType']);
        });

        // Experimenting / REMOVE in next Commit
        // SwissArmyKnife.setAndroidStatusBarColor("#DB6C6B");
        // SwissArmyKnife.setAndroidStatusBarTranslucentFlag();
        // SwissArmyKnife.setAndroidStatusBarColor("deepskyblue");
        
        this.randomImageGenerator();
        
        // Fetch User-Data from Firebase (true, because of first initialization)
        // this.loadFirebaseData(true);
        this.firestoreListen();
    }

    /*loadFirebaseData(initialize: boolean){
        firebase.query(
            (result) => {
                if (result) {

                    console.log("Event type: " + result.type);
                    console.log("Key: " + result.key);
                    console.log("Value: " + JSON.stringify(result.value));

                    if(result.value.movementItem){
                        // Movements are available

                        // RESET Arrays
                        this.pieceMovementArray = [];
                        this.pieceMovementArrayNotSelected = [];
                        this.pieceMovementArrayAll = [];
                        this.selectedArray = [];

                        // Amount of movements
                        var len = result.value.movementItem.length;

                        for (let i = 0; i < len; i++) {
                            if (result.value.movementItem[i].state != 0){
                                // Add only movements to pieceMovementArray, that are being practiced
                                this.pieceMovementArray.push({
                                    title: result.value.movementItem[i].title,
                                    state: result.value.movementItem[i].state,
                                    id: result.value.movementItem[i].id,
                                });
                            }

                            // Add all movements to pieceMovementArrayAll
                            this.pieceMovementArrayAll.push({
                                title: result.value.movementItem[i].title,
                                state: result.value.movementItem[i].state,
                                id: result.value.movementItem[i].id,
                            });

                            if(result.value.movementItem[i].lastUsed) {
                                this.pieceMovementArrayAll[i].lastUsed = result.value.movementItem[i].lastUsed;
                            }
                        }

                        if(initialize){    
                            // Show only movements, that are being practiced (onInit)
                            this.selectedArray = this.pieceMovementArray;
                        } else {
                            // ngZone is needed here to update the Listview in case of:
                            // First action => Delete Movement
                            // (If the first action was adding a movement, the listview would 
                            // refresh even without ngZone) - Why?
                            this._ngZone.run(() => {
                                // Show all piece (after adding / removing pieces)
                                this.selectedArray = this.pieceMovementArrayAll;
                            })
                            
                        }
                        
                        // Is this code-line needed? -> Saves pieceMovementAmount 
                        this.pieceMovementAmount = result.value.movementItem.length;
                        
                    } else {
                        this.pieceMovementAmount = 0;
                        console.log("No piece movements found");
                    }
                    
                    this.pieceTitle = result.value.pieceTitle;
                    this.pieceWorkNumber = result.value.pieceWorkNumber;

                    // Get Composer Name
                    this._httpService.getComposerName(result.value.composerId).subscribe((res) => {
                        this._ngZone.run(() => {
                            this.pieceComposer = res[0].name;      
                        });
                        console.log("COMPOSER NAME: " + this.pieceComposer); 
                    });

                } else {
                    console.log("Error: Piece not found");
                }
            },
            "/user/" + BackendService.token + "/piece/" + this.routerParamId['pieceId'],
            {
                singleEvent: true,
                orderBy: {
                    type: firebase.QueryOrderByType.CHILD,
                    value: 'since' // mandatory when type is 'child'
                }
            }
        );
    }*/
    public randomImageGenerator() {
        let pieceBoxBgImages = [
            "bgi1",
            "bgi2",
            "bgi3",
            "bgi1",
            "bgi2",
            "bgi3"
        ];
        let randomNumber = Math.floor((Math.random() * 5) + 0);        
        this.randomImage = pieceBoxBgImages[randomNumber];
        console.log("RANDOM IMAGE: " + this.randomImage);
    }


    public firestoreListen(): void {
        if (this.listenerUnsubscribe !== undefined) {
          console.log("Already listening");
          return;
        }
        
        // Define Firestore Piece Document
        let pieceDocument = firebase.firestore()
            .collection("user")
            .doc(BackendService.token)
            .collection("piece")
            .doc(this.pieceId);

        this.listenerUnsubscribe = pieceDocument.onSnapshot(piece => {
            if (piece.exists) {
                console.log("Document data:", JSON.stringify(piece.data()));
                this.handleSnapshot(piece);
            } else {
                console.log("Piece not found!");
            }
        });

        /*this.listenerUnsubscribe = query.onSnapshot((snapshot: firestore.QuerySnapshot) => {
            if (snapshot) {
                console.log("Handling Snapshot");
                this.handleSnapshot(snapshot);
            } else {
                console.log("No Pieces Found!");
            }
        });*/
    }

    public handleSnapshot(piece){
        this.pieceComposer = piece.data().composer;

        if(piece.data().movementItem){
            // Movements are available

            // RESET Arrays
            this.pieceMovementArray = [];
            this.pieceMovementArrayNotSelected = [];
            this.pieceMovementArrayAll = [];
            this.selectedArray = [];

            // Amount of movements
            var len = piece.data().movementItem.length;

            for (let i = 0; i < len; i++) {
                if (piece.data().movementItem[i].state != 0){
                    // Add only movements to pieceMovementArray, that are being practiced
                    this.pieceMovementArray.push({
                        title: piece.data().movementItem[i].title,
                        state: piece.data().movementItem[i].state,
                        id: piece.data().movementItem[i].id,
                    });
                }

                // Add all movements to pieceMovementArrayAll
                this.pieceMovementArrayAll.push({
                    title: piece.data().movementItem[i].title,
                    state: piece.data().movementItem[i].state,
                    id: piece.data().movementItem[i].id,
                });

                if(piece.data().movementItem[i].lastUsed) {
                    this.pieceMovementArrayAll[i].lastUsed = piece.data().movementItem[i].lastUsed;
                }
            }

            if(!this.showRemainingMovements){    
                console.log("SHOW ALL NOT " + this.showRemainingMovements);
                // Show only movements, that are being practiced (onInit)
                this.selectedArray = this.pieceMovementArray;
            } else {
                console.log("SHOW ALL");
                // ngZone is needed here to update the Listview in case of:
                // First action => Delete Movement
                // (If the first action was adding a movement, the listview would 
                // refresh even without ngZone) - Why?
                this._ngZone.run(() => {
                    // Show all piece (after adding / removing pieces)
                    this.selectedArray = this.pieceMovementArrayAll;
                })
                
            }
            
            // Is this code-line needed? -> Saves pieceMovementAmount 
            this.pieceMovementAmount = piece.data().movementItem.length;
            
        } else {
            this.pieceMovementAmount = 0;
            console.log("No piece movements found");
        }
        
        this.pieceTitle = piece.data().pieceTitle;
        this.pieceWorkNumber = piece.data().pieceWorkNumber;

        // DEPRECATED: Get Composer Name
        // DELETED IN NEXT COMMIT
    
        /* this._httpService.getComposerName(piece.data().composerId).subscribe((res) => {
            this._ngZone.run(() => {
                this.pieceComposer = res[0].name;      
            });
            console.log("COMPOSER NAME: " + this.pieceComposer); 
        });*/
    }

    ngOnInit() {
        // Hide Action-Bar
        this._page.actionBarHidden = true;

        // Create onBackButtonPressed-Listener
        application.android.on(AndroidApplication.activityBackPressedEvent, (data: AndroidActivityBackPressedEventData) => {
            console.log("BACK BUTTON EVENT TRIGGERED");
            //this._router.navigate(['/addpiece']);
            if(this.routerParamId['originType'] == 1){
                this._routerExtensions.navigate(["/home"], { clearHistory: true });
            }
        });
    }

    toggleRemainingMovements(type: number){

        this.showRemainingMovements = !this.showRemainingMovements;
        if(this.showRemainingMovements === false) {
            this.selectedArray = this.pieceMovementArray;
            this.toggleButtonText = "Add / Remove Movements";
        } else {
            this.selectedArray = this.pieceMovementArrayAll;
            this.toggleButtonText = "Cancel";
        }
    }

    recordSession(args){
        this._router.navigate(['/piece-recorder/'+this.routerParamId['pieceId']+'/'+this.selectedArray[args.index].id]);
    }

    handleItemTap(args){
        if(!this.showRemainingMovements){
            /*
             * DISABLED!
             * 

            // Reading-Mode -> Go to piece recorder
            this.recordSession(args);

            */
        } else {
            // Editing-Mode -> Add / Remove movement from list
            if(this.pieceMovementArrayAll[args.index].state == 0){
                this.updateMovementList(1, args); // ADD movement
            } else if(this.pieceMovementArrayAll[args.index].state == 1){
                this.updateMovementList(0, args); // REMOVE movement
            }
        }
    }

    updateMovementList(state: number, args){
        if(this.pieceMovementAmount > 0) {
            let that = this;
            let currentDate = new Date().getTime();
            if (state == 0 && this.pieceMovementArray.length < 2){
                // DELETING LAST MOVEMENT -> Inform User, that piece will be deleted
                dialogs.confirm({
                    title: "Attention!",
                    message:  '"' + this.pieceMovementArrayAll[args.index].title + '" is your last remaining movement! Do you want to delete the entire piece from your practicing list?',
                    okButtonText: "Yes, delete entire piece",
                    cancelButtonText: "No!",
                }).then(function (result) {
                    if(result){
                        // REMOVE ENTIRE PIECE THROUGH pieceService
                        //that._ngZone.run(() => {
                            console.log("DELETE MOVEMENTS AND PIECE: " + that.pieceId);
                            that._pieceService.removePiece(that.pieceId).then(function() {
                                console.log("PIECE DELETED");
                                that._routerExtensions.navigate(["/piece-list"], { clearHistory: true });
                            });
                        //});
                    }
                });
            } else {
                // ADD / REMOVE MOVEMENT
                //that._ngZone.run(() => {
                    this.pieceMovementArrayAll[args.index].state = state;
                    this.pieceMovementArrayAll[args.index].lastUsed = currentDate;
                    this._pieceService.updateMovement(Number(this.pieceId), this.pieceMovementArrayAll);
                //});
            }

            /* if(type == 1) {
                // TYPE 1 = ADD MOVEMENT to PRACTICE LIST
                console.log("HANDLE ADD");
                this.pieceMovementArrayAll[args.index].state = 1;
                this.pieceMovementArrayAll[args.index].lastUsed = currentDate;
                this._pieceService.updateMovement(Number(this.pieceId), this.pieceMovementArrayAll);

                // Set lastPieceId & lastMovementId in BackendService DEL
                /*BackendService.lastPieceId = Number(this.routerParamId['pieceId']);
                BackendService.lastMovementId = Number(args.index);

                //this.firebaseAction();
            } else if (type == 2){
                // TYPE 2 = REMOVE MOVEMENT FROM PRACTICE LIST
                console.log("HANDLE REMOVE");
                if(this.pieceMovementArray.length < 2) {
                    // IF DELETING LAST MOVEMENT -> Inform User, that piece will be deleted | Still in DEV-Mode
                    dialogs.confirm({
                        title: "Attention!",
                        message:  '"' + this.pieceMovementArrayAll[args.index].title + '" is your last remaining movement! Do you want to delete the entire piece from your practicing list?',
                        okButtonText: "Yes, delete entire piece",
                        cancelButtonText: "No!",
                    }).then(function (result) {
                        if(result){
                            // REMOVE ENTIRE PIECE & PRACTICE SESSIONS THROUGH pieceService
                            that._pieceService.removePiece(that.routerParamId['pieceId'], -1).then(function() {
                                console.log("PIECE DELETED");
                                that._routerExtensions.navigate(["/piece-list"], { clearHistory: true });
                            });
                        }
                    });
                } else {
                    // SURE you want to delete?
                    dialogs.confirm({
                        title: "Delete movement from list?",
                        message: "Do you want to remove this movement from your Practice-List? \n\nYour Practice-Progress (Practice-Sessions) won't be deleted.",
                        okButtonText: "Yes, remove please",
                        cancelButtonText: "No!",
                    }).then(function (result) {
                        if(result){
                            that._pieceService.removePiece(that.routerParamId['pieceId'], args.index).then(function() {
                                // Set BackendService: lastMovementId to none (-1) DEL
                                /*if(BackendService.lastMovementId == args.index){
                                    BackendService.lastMovementId = -1;
                                }

                                that.pieceMovementArrayAll[args.index].state = 0;
                                that.firebaseAction();
                            });   
                        }
                    });
                } 
            }*/
        }
    }

    firebaseAction(){
        console.log("MAINTENANCE firebaseAction() fired");
        /*console.log("ARRAY: "+JSON.stringify(this.pieceMovementArrayAll));
        let that = this;
        firebase.update(
                '/user/'+BackendService.token+'/piece/'+this.routerParamId['pieceId']+'/movementItem',
                this.pieceMovementArrayAll
            ).then(
            function () {
                // Reload Firebase-Data (false, because show all pieces)
                that.loadFirebaseData(false);
            },
            function (error) {
                console.log("ERROR: " + error);
            }); */
    }

    public firestoreStopListening(): void {
        if (this.listenerUnsubscribe === undefined) {
          console.log("Please start listening first ;)");
          return;
        }
    
        this.listenerUnsubscribe();
        this.listenerUnsubscribe = undefined;
    }

    ngOnDestroy() {
        this.firestoreStopListening();
        // Remove BackPressedEvent Listener
        application.android.off(AndroidApplication.activityBackPressedEvent);
        console.log("PieceDashboard - ngOnDestroy()");
    }
}