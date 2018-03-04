# Node Ethernet/IP

This is a project that I am working on with the intent on creating a highly intuitive and easy to use Ethernet/IP API for interfacing ControlLogix and CompactLogix PLCs.

# Developement Status

I am only working on this at the moment as a *pet* project in my free time though I am working consistently and will continue to add features as things proceed. This said, anyone with network experience and a node background is welcome to reach out to me via the contact form on my [website](http://www.canaanseaton.com/) or by email.

## * Abbreviated Task List

- [x] Build Ethernet/IP Encapsulation Helper Library
- [x] Build ENIP Socket Abstraction class
- [x] Build Tag Class Abstraction
- [ ] Build TagGroup Class
- [ ] Extend ENIP Class for Rockwell Controller Specific Services and Commands

# Project Status Updates

- **[3-3-2017]** I have successfully been able to read and write from a ControlLogix controller via the enip utilites.  Moving forward, I will be abstracting all the complexities associated with accessing data in a Rockwell Controller into a `Controller` class for easy PLC Tag manipulation.
